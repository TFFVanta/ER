#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string next_audit_id() {
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

void AuditStore::append(const AuditRecord& record) {
    std::scoped_lock lock(mutex_);
    records_.push_back(record);
}

std::vector<AuditRecord> AuditStore::find_by_session(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    std::vector<AuditRecord> matching;
    for (const auto& record : records_) {
        if (record.session_id == session_id) {
            matching.push_back(record);
        }
    }
    return matching;
}

std::vector<AuditRecord> AuditStore::list() const {
    std::scoped_lock lock(mutex_);
    return records_;
}

ComplianceEngineApi::ComplianceEngineApi(const std::vector<CompliancePolicy>* policies,
                                         const std::vector<ComplianceReport>* reports,
                                         const AuditStore& audit_store,
                                         const ComplianceMetrics* metrics)
    : policies_(policies), reports_(reports), audit_store_(audit_store), metrics_(metrics) {}

ApiResponse ComplianceEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/compliance-policies") {
        std::vector<std::string> values;
        for (const auto& policy : *policies_) {
            values.push_back(policy.id + ":" + policy.name);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/compliance-reports") {
        std::vector<std::string> values;
        for (const auto& report : *reports_) {
            values.push_back(report.session_id + ":" + to_string(report.status));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/audit-records") {
        std::vector<std::string> values;
        for (const auto& record : audit_store_.list()) {
            values.push_back(record.session_id + ":" + record.id + ":" + record.category);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/compliance-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"audit_records\":" << metrics_->audit_records << ","
            << "\"total_reports\":" << metrics_->total_reports << ","
            << "\"compliant_reports\":" << metrics_->compliant_reports << ","
            << "\"non_compliant_reports\":" << metrics_->non_compliant_reports << ","
            << "\"needs_review_reports\":" << metrics_->needs_review_reports
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

ComplianceEngine::ComplianceEngine(Runtime& runtime,
                                   StructuredLogger& logger,
                                   MetricsCollector& metrics,
                                   SessionEngine& session_engine,
                                   VerificationEngine& verification_engine,
                                   GovernanceEngine& governance_engine,
                                   PolicyAutomationEngine& policy_automation_engine)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      session_engine_(session_engine),
      verification_engine_(verification_engine),
      governance_engine_(governance_engine),
      policy_automation_engine_(policy_automation_engine),
      events_(runtime.events()) {}

void ComplianceEngine::register_policy(CompliancePolicy policy) {
    if (policy.id.empty()) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "compliance policy id is required");
    }
    std::scoped_lock lock(mutex_);
    policies_.push_back(std::move(policy));
}

void ComplianceEngine::record_audit(AuditRecord record) {
    audit_store_.append(record);
    emit(AuditEventKind::AuditRecorded, record.session_id, record.id);
    refresh_metrics();
}

ComplianceReport ComplianceEngine::check(std::string_view policy_id,
                                         std::string_view session_id) {
    const auto started = std::chrono::steady_clock::now();
    const auto policy = require_policy(policy_id);
    const auto session = session_engine_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for compliance check");
    }

    auto verification = verification_engine_.latest_result(session_id);
    auto audits = audit_store_.find_by_session(session_id);
    const auto governance = governance_engine_.snapshot();
    const auto automation = policy_automation_engine_.snapshot();

    ComplianceReport report;
    report.id = std::string(session_id) + ".compliance." + next_audit_id();
    report.session_id = std::string(session_id);
    report.policy_id = std::string(policy_id);

    emit(AuditEventKind::ComplianceChecked, report.session_id, report.id);

    if (policy.require_completed_session && session->status == SessionStatus::Completed) {
        report.satisfied_checks.push_back("session.completed");
    } else if (policy.require_completed_session) {
        report.violations.push_back("session_not_completed");
    }

    if (policy.require_verification_pass) {
        if (!verification) {
            const auto request = verification_engine_.create_request(session_id);
            verification = verification_engine_.verify(request.id);
        }
        if (verification && verification->status == VerificationStatus::Passed) {
            report.satisfied_checks.push_back("verification.passed");
        } else {
            report.violations.push_back("verification_not_passed");
        }
    }

    if (policy.require_governance_approval) {
        const bool approved = std::any_of(governance.reviews.begin(), governance.reviews.end(), [&](const GovernanceReview& review) {
            return review.session_id == session_id && review.decision == GovernanceDecision::Approved;
        });
        if (approved) {
            report.satisfied_checks.push_back("governance.approved");
        } else {
            report.violations.push_back("governance_approval_missing");
        }
    }

    if (policy.require_policy_automation) {
        const bool automated = std::any_of(automation.evaluations.begin(), automation.evaluations.end(), [&](const PolicyEvaluation& evaluation) {
            return evaluation.session_id == session_id && evaluation.decision != PolicyAutomationDecision::None;
        });
        if (automated) {
            report.satisfied_checks.push_back("policy.automation.executed");
        } else {
            report.violations.push_back("policy_automation_missing");
        }
    }

    for (const auto& category : policy.required_audit_categories) {
        const auto found = std::find_if(audits.begin(), audits.end(), [&](const AuditRecord& record) {
            return record.category == category;
        });
        if (found != audits.end()) {
            report.satisfied_checks.push_back("audit." + category);
            report.referenced_records.push_back(found->id);
        } else {
            report.violations.push_back("audit_category_missing:" + category);
        }
    }

    if (report.violations.empty()) {
        report.status = ComplianceStatus::Compliant;
    } else if (std::any_of(report.violations.begin(), report.violations.end(), [](const std::string& violation) {
        return violation.find("missing") != std::string::npos;
    })) {
        report.status = ComplianceStatus::NeedsReview;
    } else {
        report.status = ComplianceStatus::NonCompliant;
    }

    report.summary = to_string(report.status) + " with "
        + std::to_string(report.satisfied_checks.size()) + " satisfied check(s)";

    {
        std::scoped_lock lock(mutex_);
        reports_.push_back(report);
    }

    emit(report.status == ComplianceStatus::Compliant ? AuditEventKind::CompliancePassed : AuditEventKind::ComplianceFailed,
         report.session_id,
         report.summary);
    refresh_metrics(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started));
    return report;
}

std::optional<ComplianceReport> ComplianceEngine::latest_report(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    for (auto it = reports_.rbegin(); it != reports_.rend(); ++it) {
        if (it->session_id == session_id) {
            return *it;
        }
    }
    return std::nullopt;
}

ComplianceSnapshot ComplianceEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {policies_, reports_, audit_store_.list(), events_.history(), compliance_metrics_};
}

ComplianceEngineApi ComplianceEngine::api() const {
    return ComplianceEngineApi{&policies_, &reports_, audit_store_, &compliance_metrics_};
}

CompliancePolicy ComplianceEngine::require_policy(std::string_view policy_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = std::find_if(policies_.begin(), policies_.end(), [&](const CompliancePolicy& policy) {
        return policy.id == policy_id;
    });
    if (it == policies_.end()) {
        throw OperatorError(ErrorCode::LifecycleFailure, "compliance policy not found");
    }
    return *it;
}

void ComplianceEngine::emit(AuditEventKind kind, std::string session_id, std::string payload) {
    events_.emit({next_audit_id(), kind, std::move(session_id), std::move(payload), Clock::now()});
}

void ComplianceEngine::refresh_metrics(std::chrono::milliseconds duration) {
    ComplianceMetrics refreshed;
    std::vector<ComplianceReport> reports;
    {
        std::scoped_lock lock(mutex_);
        reports = reports_;
    }
    refreshed.audit_records = audit_store_.list().size();
    refreshed.total_reports = reports.size();
    for (const auto& report : reports) {
        switch (report.status) {
        case ComplianceStatus::Compliant:
            ++refreshed.compliant_reports;
            break;
        case ComplianceStatus::NonCompliant:
            ++refreshed.non_compliant_reports;
            break;
        case ComplianceStatus::NeedsReview:
            ++refreshed.needs_review_reports;
            break;
        case ComplianceStatus::Unknown:
            break;
        }
    }
    if (!reports.empty() && duration.count() > 0) {
        if (compliance_metrics_.average_check_time.count() == 0) {
            refreshed.average_check_time = duration;
        } else {
            const auto prior = compliance_metrics_.average_check_time.count() * static_cast<long long>(reports.size() - 1);
            refreshed.average_check_time = std::chrono::milliseconds((prior + duration.count()) / static_cast<long long>(reports.size()));
        }
    } else {
        refreshed.average_check_time = compliance_metrics_.average_check_time;
    }
    compliance_metrics_ = refreshed;
    metrics_.record_build_statistic("compliance_reports", static_cast<double>(refreshed.total_reports));
    metrics_.record_build_statistic("audit_records", static_cast<double>(refreshed.audit_records));
}

} // namespace exotic::codex_operator
