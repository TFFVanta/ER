#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string next_policy_id() {
    return std::to_string(std::chrono::duration_cast<std::chrono::microseconds>(
        Clock::now().time_since_epoch()).count());
}

std::string json_quote(std::string_view value) {
    std::ostringstream out;
    out << '"';
    for (const char ch : value) {
        switch (ch) {
        case '\\': out << "\\\\"; break;
        case '"': out << "\\\""; break;
        case '\n': out << "\\n"; break;
        case '\r': out << "\\r"; break;
        case '\t': out << "\\t"; break;
        default: out << ch; break;
        }
    }
    out << '"';
    return out.str();
}

std::string json_array(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (index != 0) {
            out << ",";
        }
        out << json_quote(values[index]);
    }
    out << "]";
    return out.str();
}

} // namespace

PolicyAutomationEngineApi::PolicyAutomationEngineApi(const std::vector<PolicyAutomation>* automations,
                                                     const std::vector<PolicyEvaluation>* evaluations,
                                                     const PolicyAutomationMetrics* metrics)
    : automations_(automations), evaluations_(evaluations), metrics_(metrics) {}

ApiResponse PolicyAutomationEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/policy-automations") {
        std::vector<std::string> values;
        for (const auto& automation : *automations_) {
            values.push_back(automation.id + ":" + automation.name);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/policy-evaluations") {
        std::vector<std::string> values;
        for (const auto& evaluation : *evaluations_) {
            values.push_back(evaluation.session_id + ":" + to_string(evaluation.decision));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/policy-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"registered_automations\":" << metrics_->registered_automations << ","
            << "\"total_evaluations\":" << metrics_->total_evaluations << ","
            << "\"auto_approved\":" << metrics_->auto_approved << ","
            << "\"auto_rejected\":" << metrics_->auto_rejected << ","
            << "\"auto_escalated\":" << metrics_->auto_escalated
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

PolicyAutomationEngine::PolicyAutomationEngine(Runtime& runtime,
                                               StructuredLogger& logger,
                                               MetricsCollector& metrics,
                                               SessionEngine& session_engine,
                                               VerificationEngine& verification_engine,
                                               GovernanceEngine& governance_engine)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      session_engine_(session_engine),
      verification_engine_(verification_engine),
      governance_engine_(governance_engine),
      events_(runtime.events()) {}

void PolicyAutomationEngine::register_automation(PolicyAutomation automation) {
    if (automation.id.empty()) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "policy automation id is required");
    }
    const auto automation_id = automation.id;
    {
        std::scoped_lock lock(mutex_);
        automations_.push_back(std::move(automation));
    }
    emit(PolicyAutomationEventKind::AutomationRegistered, "", automation_id);
    refresh_metrics();
}

PolicyEvaluation PolicyAutomationEngine::evaluate(std::string_view automation_id,
                                                  std::string_view session_id) {
    const auto started = std::chrono::steady_clock::now();
    const auto automation = require_automation(automation_id);
    if (!automation.enabled) {
        throw OperatorError(ErrorCode::LifecycleFailure, "policy automation is disabled");
    }
    const auto session = session_engine_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for policy evaluation");
    }

    emit(PolicyAutomationEventKind::EvaluationStarted, std::string(session_id), std::string(automation_id));

    auto verification = verification_engine_.latest_result(session_id);
    if (!verification) {
        const auto request = verification_engine_.create_request(session_id);
        verification = verification_engine_.verify(request.id);
    }

    const auto review = governance_engine_.request_review(session_id, automation.approval_policy);

    PolicyEvaluation evaluation;
    evaluation.id = std::string(session_id) + ".policy." + next_policy_id();
    evaluation.automation_id = std::string(automation_id);
    evaluation.session_id = std::string(session_id);
    evaluation.review_id = review.id;

    for (const auto& rule : automation.rules) {
        bool matched = true;
        if (rule.require_verification_pass && verification->status != VerificationStatus::Passed) {
            matched = false;
            evaluation.violations.push_back(rule.id + ":verification_not_passed");
        }
        if (rule.require_build_evidence && std::none_of(verification->evidence_ids.begin(), verification->evidence_ids.end(), [](const std::string& id) {
                return id.find("build") != std::string::npos;
            })) {
            matched = false;
            evaluation.violations.push_back(rule.id + ":build_evidence_missing");
        }
        if (rule.require_documentation_evidence && std::none_of(verification->evidence_ids.begin(), verification->evidence_ids.end(), [](const std::string& id) {
                return id.find("doc") != std::string::npos || id.find("docs") != std::string::npos;
            })) {
            matched = false;
            evaluation.violations.push_back(rule.id + ":documentation_evidence_missing");
        }
        if (rule.require_review_evidence && std::none_of(verification->evidence_ids.begin(), verification->evidence_ids.end(), [](const std::string& id) {
                return id.find("review") != std::string::npos || id.find("approval") != std::string::npos;
            })) {
            matched = false;
            evaluation.violations.push_back(rule.id + ":review_evidence_missing");
        }
        if (matched) {
            evaluation.matched_rules.push_back(rule.id);
        }
    }

    if (evaluation.violations.empty()) {
        const bool any_auto_approve = std::any_of(automation.rules.begin(), automation.rules.end(), [](const PolicyRule& rule) {
            return rule.auto_approve_on_pass;
        });
        if (any_auto_approve) {
            (void)governance_engine_.approve(review.id, "policy-automation", "automatic approval");
            evaluation.decision = PolicyAutomationDecision::AutoApprove;
        }
    } else {
        const bool any_auto_reject = std::any_of(automation.rules.begin(), automation.rules.end(), [](const PolicyRule& rule) {
            return rule.auto_reject_on_failure;
        });
        const bool any_auto_escalate = std::any_of(automation.rules.begin(), automation.rules.end(), [](const PolicyRule& rule) {
            return rule.auto_escalate_on_missing_evidence;
        });
        const bool missing_evidence = std::any_of(evaluation.violations.begin(), evaluation.violations.end(), [](const std::string& violation) {
            return violation.find("missing") != std::string::npos;
        });

        if (missing_evidence && any_auto_escalate) {
            (void)governance_engine_.escalate(review.id, "automatic escalation due to missing evidence");
            evaluation.decision = PolicyAutomationDecision::AutoEscalate;
        } else if (any_auto_reject) {
            (void)governance_engine_.reject(review.id, "policy-automation", "automatic rejection");
            evaluation.decision = PolicyAutomationDecision::AutoReject;
        }
    }

    evaluation.summary = to_string(evaluation.decision) + " with "
        + std::to_string(evaluation.matched_rules.size()) + " matched rule(s)";

    {
        std::scoped_lock lock(mutex_);
        evaluations_.push_back(evaluation);
    }
    emit(PolicyAutomationEventKind::EvaluationCompleted, evaluation.session_id, evaluation.summary);
    if (evaluation.decision != PolicyAutomationDecision::None) {
        emit(PolicyAutomationEventKind::ActionExecuted, evaluation.session_id, to_string(evaluation.decision));
    }
    refresh_metrics(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started));
    return evaluation;
}

std::optional<PolicyAutomation> PolicyAutomationEngine::find_automation(std::string_view automation_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = std::find_if(automations_.begin(), automations_.end(), [&](const PolicyAutomation& automation) {
        return automation.id == automation_id;
    });
    if (it == automations_.end()) {
        return std::nullopt;
    }
    return *it;
}

PolicyAutomationSnapshot PolicyAutomationEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {automations_, evaluations_, events_.history(), automation_metrics_};
}

PolicyAutomationEngineApi PolicyAutomationEngine::api() const {
    return PolicyAutomationEngineApi{&automations_, &evaluations_, &automation_metrics_};
}

PolicyAutomation PolicyAutomationEngine::require_automation(std::string_view automation_id) const {
    const auto automation = find_automation(automation_id);
    if (!automation) {
        throw OperatorError(ErrorCode::LifecycleFailure, "policy automation not found");
    }
    return *automation;
}

void PolicyAutomationEngine::emit(PolicyAutomationEventKind kind, std::string session_id, std::string payload) {
    events_.emit({next_policy_id(), kind, std::move(session_id), std::move(payload), Clock::now()});
}

void PolicyAutomationEngine::refresh_metrics(std::chrono::milliseconds duration) {
    PolicyAutomationMetrics refreshed;
    std::vector<PolicyAutomation> automations;
    std::vector<PolicyEvaluation> evaluations;
    {
        std::scoped_lock lock(mutex_);
        automations = automations_;
        evaluations = evaluations_;
    }
    refreshed.registered_automations = automations.size();
    refreshed.total_evaluations = evaluations.size();
    for (const auto& evaluation : evaluations) {
        switch (evaluation.decision) {
        case PolicyAutomationDecision::AutoApprove:
            ++refreshed.auto_approved;
            break;
        case PolicyAutomationDecision::AutoReject:
            ++refreshed.auto_rejected;
            break;
        case PolicyAutomationDecision::AutoEscalate:
            ++refreshed.auto_escalated;
            break;
        case PolicyAutomationDecision::None:
            break;
        }
    }
    if (!evaluations.empty() && duration.count() > 0) {
        if (automation_metrics_.average_evaluation_time.count() == 0) {
            refreshed.average_evaluation_time = duration;
        } else {
            const auto prior = automation_metrics_.average_evaluation_time.count() * static_cast<long long>(evaluations.size() - 1);
            refreshed.average_evaluation_time = std::chrono::milliseconds((prior + duration.count()) / static_cast<long long>(evaluations.size()));
        }
    } else {
        refreshed.average_evaluation_time = automation_metrics_.average_evaluation_time;
    }
    automation_metrics_ = refreshed;
    metrics_.record_build_statistic("policy_automations", static_cast<double>(refreshed.registered_automations));
    metrics_.record_build_statistic("policy_evaluations", static_cast<double>(refreshed.total_evaluations));
}

} // namespace exotic::codex_operator
