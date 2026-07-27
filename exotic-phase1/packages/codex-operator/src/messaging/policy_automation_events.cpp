#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(PolicyAutomationEventKind kind) {
    switch (kind) {
    case PolicyAutomationEventKind::AutomationRegistered: return "policy.automation_registered";
    case PolicyAutomationEventKind::EvaluationStarted: return "policy.evaluation_started";
    case PolicyAutomationEventKind::EvaluationCompleted: return "policy.evaluation_completed";
    case PolicyAutomationEventKind::ActionExecuted: return "policy.action_executed";
    }
    return "policy.unknown";
}

} // namespace

PolicyAutomationEventStream::PolicyAutomationEventStream(EventBus& bus) : bus_(bus) {}

void PolicyAutomationEventStream::emit(const PolicyAutomationEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<PolicyAutomationEventMessage> PolicyAutomationEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(PolicyAutomationDecision value) {
    switch (value) {
    case PolicyAutomationDecision::None: return "none";
    case PolicyAutomationDecision::AutoApprove: return "auto_approve";
    case PolicyAutomationDecision::AutoReject: return "auto_reject";
    case PolicyAutomationDecision::AutoEscalate: return "auto_escalate";
    }
    return "unknown";
}

std::string to_string(PolicyAutomationEventKind value) {
    switch (value) {
    case PolicyAutomationEventKind::AutomationRegistered: return "automation_registered";
    case PolicyAutomationEventKind::EvaluationStarted: return "evaluation_started";
    case PolicyAutomationEventKind::EvaluationCompleted: return "evaluation_completed";
    case PolicyAutomationEventKind::ActionExecuted: return "action_executed";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
