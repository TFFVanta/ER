#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string next_governance_id() {
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

ApprovalPolicy default_policy() {
    ApprovalPolicy policy;
    policy.id = "default-governance-policy";
    policy.name = "Default Governance Policy";
    return policy;
}

} // namespace

GovernanceEngineApi::GovernanceEngineApi(const std::vector<GovernanceReview>* reviews,
                                         const GovernanceMetrics* metrics)
    : reviews_(reviews), metrics_(metrics) {}

ApiResponse GovernanceEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/governance-reviews") {
        std::vector<std::string> values;
        for (const auto& review : *reviews_) {
            values.push_back(review.session_id + ":" + review.id + ":" + to_string(review.decision));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/governance-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"total_reviews\":" << metrics_->total_reviews << ","
            << "\"approved_reviews\":" << metrics_->approved_reviews << ","
            << "\"rejected_reviews\":" << metrics_->rejected_reviews << ","
            << "\"escalated_reviews\":" << metrics_->escalated_reviews << ","
            << "\"pending_reviews\":" << metrics_->pending_reviews
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

GovernanceEngine::GovernanceEngine(Runtime& runtime,
                                   StructuredLogger& logger,
                                   MetricsCollector& metrics,
                                   SessionEngine& session_engine,
                                   VerificationEngine& verification_engine)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      session_engine_(session_engine),
      verification_engine_(verification_engine),
      events_(runtime.events()) {}

GovernanceReview GovernanceEngine::request_review(std::string_view session_id, ApprovalPolicy policy) {
    const auto session = session_engine_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for governance review");
    }

    auto verification = verification_engine_.latest_result(session_id);
    if (!verification) {
        const auto request = verification_engine_.create_request(session_id);
        verification = verification_engine_.verify(request.id);
    }

    if (policy.id.empty()) {
        policy = default_policy();
    }

    GovernanceReview review;
    review.id = std::string(session_id) + ".governance." + next_governance_id();
    review.session_id = std::string(session_id);
    review.verification_request_id = verification->request_id;
    review.policy = std::move(policy);
    review.notes.push_back("verification_status=" + to_string(verification->status));

    session_engine_.request_approval(session->id, "governance review required");
    {
        std::scoped_lock lock(mutex_);
        reviews_.push_back(review);
    }
    emit(GovernanceEventKind::ReviewRequested, review.session_id, review.id);
    emit(GovernanceEventKind::ReviewStarted, review.session_id, review.verification_request_id);
    refresh_metrics();
    return require_review(review.id);
}

GovernanceReview GovernanceEngine::approve(std::string_view review_id,
                                           std::string approver,
                                           std::string note) {
    auto review = require_review(review_id);
    if (review.policy.verification_pass_required) {
        const auto latest = verification_engine_.latest_result(review.session_id);
        if (!latest || latest->status != VerificationStatus::Passed) {
            throw OperatorError(ErrorCode::LifecycleFailure, "verification must pass before approval");
        }
    }
    if (!review.policy.allow_self_approval && !review.approvers.empty()) {
        const bool duplicate = std::find(review.approvers.begin(), review.approvers.end(), approver) != review.approvers.end();
        if (duplicate) {
            throw OperatorError(ErrorCode::LifecycleFailure, "duplicate approver is not allowed");
        }
    }

    review.approvers.push_back(approver);
    review.notes.push_back(std::move(note));
    if (review.approvers.size() >= review.policy.minimum_approvers) {
        review.decision = GovernanceDecision::Approved;
        review.completed_at = Clock::now();
        session_engine_.record_approval(review.session_id, true, approver);
        verification_engine_.record_evidence({review.id + ".approval",
                                              review.session_id,
                                              EvidenceKind::Approval,
                                              "governance approval recorded",
                                              {},
                                              {{"approver", approver}, {"policy", review.policy.id}},
                                              Clock::now()});
        emit(GovernanceEventKind::ReviewApproved, review.session_id, approver);
    }
    persist(review);
    return require_review(review.id);
}

GovernanceReview GovernanceEngine::reject(std::string_view review_id,
                                          std::string approver,
                                          std::string note) {
    auto review = require_review(review_id);
    review.decision = GovernanceDecision::Rejected;
    review.approvers.push_back(std::move(approver));
    review.notes.push_back(std::move(note));
    review.completed_at = Clock::now();
    session_engine_.record_approval(review.session_id, false, review.approvers.back());
    emit(GovernanceEventKind::ReviewRejected, review.session_id, review.approvers.back());
    persist(review);
    return require_review(review.id);
}

GovernanceReview GovernanceEngine::escalate(std::string_view review_id,
                                            std::string note) {
    auto review = require_review(review_id);
    review.decision = GovernanceDecision::Escalated;
    review.notes.push_back(std::move(note));
    emit(GovernanceEventKind::ReviewEscalated, review.session_id, review.notes.back());
    persist(review);
    return require_review(review.id);
}

std::optional<GovernanceReview> GovernanceEngine::find(std::string_view review_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = std::find_if(reviews_.begin(), reviews_.end(), [&](const GovernanceReview& review) {
        return review.id == review_id;
    });
    if (it == reviews_.end()) {
        return std::nullopt;
    }
    return *it;
}

GovernanceSnapshot GovernanceEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {reviews_, events_.history(), governance_metrics_};
}

GovernanceEngineApi GovernanceEngine::api() const {
    return GovernanceEngineApi{&reviews_, &governance_metrics_};
}

GovernanceReview GovernanceEngine::require_review(std::string_view review_id) const {
    const auto review = find(review_id);
    if (!review) {
        throw OperatorError(ErrorCode::LifecycleFailure, "governance review not found");
    }
    return *review;
}

void GovernanceEngine::persist(const GovernanceReview& review) {
    {
        std::scoped_lock lock(mutex_);
        const auto it = std::find_if(reviews_.begin(), reviews_.end(), [&](const GovernanceReview& current) {
            return current.id == review.id;
        });
        if (it == reviews_.end()) {
            reviews_.push_back(review);
        } else {
            *it = review;
        }
    }
    refresh_metrics();
}

void GovernanceEngine::emit(GovernanceEventKind kind, std::string session_id, std::string payload) {
    events_.emit({next_governance_id(), kind, std::move(session_id), std::move(payload), Clock::now()});
}

void GovernanceEngine::refresh_metrics() {
    GovernanceMetrics refreshed;
    std::vector<GovernanceReview> reviews;
    {
        std::scoped_lock lock(mutex_);
        reviews = reviews_;
    }
    for (const auto& review : reviews) {
        ++refreshed.total_reviews;
        switch (review.decision) {
        case GovernanceDecision::Pending:
            ++refreshed.pending_reviews;
            break;
        case GovernanceDecision::Approved:
            ++refreshed.approved_reviews;
            break;
        case GovernanceDecision::Rejected:
            ++refreshed.rejected_reviews;
            break;
        case GovernanceDecision::Escalated:
            ++refreshed.escalated_reviews;
            break;
        }
        if (review.completed_at) {
            const auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(*review.completed_at - review.created_at);
            if (refreshed.average_review_time.count() == 0) {
                refreshed.average_review_time = duration;
            } else {
                const auto finished = refreshed.approved_reviews + refreshed.rejected_reviews + refreshed.escalated_reviews;
                const auto prior = refreshed.average_review_time.count() * static_cast<long long>(finished - 1);
                refreshed.average_review_time = std::chrono::milliseconds((prior + duration.count()) / static_cast<long long>(finished));
            }
        }
    }
    governance_metrics_ = refreshed;
    metrics_.record_build_statistic("governance_reviews", static_cast<double>(refreshed.total_reviews));
    metrics_.record_build_statistic("governance_pending", static_cast<double>(refreshed.pending_reviews));
}

} // namespace exotic::codex_operator
