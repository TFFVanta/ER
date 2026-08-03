#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(GovernanceEventKind kind) {
    switch (kind) {
    case GovernanceEventKind::ReviewRequested: return "governance.review_requested";
    case GovernanceEventKind::ReviewStarted: return "governance.review_started";
    case GovernanceEventKind::ReviewApproved: return "governance.review_approved";
    case GovernanceEventKind::ReviewRejected: return "governance.review_rejected";
    case GovernanceEventKind::ReviewEscalated: return "governance.review_escalated";
    }
    return "governance.unknown";
}

} // namespace

GovernanceEventStream::GovernanceEventStream(EventBus& bus) : bus_(bus) {}

void GovernanceEventStream::emit(const GovernanceEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<GovernanceEventMessage> GovernanceEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(GovernanceDecision value) {
    switch (value) {
    case GovernanceDecision::Pending: return "pending";
    case GovernanceDecision::Approved: return "approved";
    case GovernanceDecision::Rejected: return "rejected";
    case GovernanceDecision::Escalated: return "escalated";
    }
    return "unknown";
}

std::string to_string(GovernanceEventKind value) {
    switch (value) {
    case GovernanceEventKind::ReviewRequested: return "review_requested";
    case GovernanceEventKind::ReviewStarted: return "review_started";
    case GovernanceEventKind::ReviewApproved: return "review_approved";
    case GovernanceEventKind::ReviewRejected: return "review_rejected";
    case GovernanceEventKind::ReviewEscalated: return "review_escalated";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
