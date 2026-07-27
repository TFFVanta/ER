#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(SessionEventKind kind) {
    switch (kind) {
    case SessionEventKind::SessionCreated: return "session.created";
    case SessionEventKind::PromptCompiled: return "session.prompt_compiled";
    case SessionEventKind::AssignmentQueued: return "session.assignment_queued";
    case SessionEventKind::SessionStarted: return "session.started";
    case SessionEventKind::ApprovalRequested: return "session.approval_requested";
    case SessionEventKind::ApprovalReceived: return "session.approval_received";
    case SessionEventKind::EvidenceAttached: return "session.evidence_attached";
    case SessionEventKind::VerificationStarted: return "session.verification_started";
    case SessionEventKind::VerificationCompleted: return "session.verification_completed";
    case SessionEventKind::SessionCompleted: return "session.completed";
    case SessionEventKind::SessionFailed: return "session.failed";
    case SessionEventKind::SessionCancelled: return "session.cancelled";
    case SessionEventKind::SessionArchived: return "session.archived";
    }
    return "session.unknown";
}

} // namespace

SessionEventStream::SessionEventStream(EventBus& bus) : bus_(bus) {}

void SessionEventStream::emit(const SessionEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["objective_id"] = event.objective_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<SessionEventMessage> SessionEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(SessionEventKind value) {
    switch (value) {
    case SessionEventKind::SessionCreated: return "session_created";
    case SessionEventKind::PromptCompiled: return "prompt_compiled";
    case SessionEventKind::AssignmentQueued: return "assignment_queued";
    case SessionEventKind::SessionStarted: return "session_started";
    case SessionEventKind::ApprovalRequested: return "approval_requested";
    case SessionEventKind::ApprovalReceived: return "approval_received";
    case SessionEventKind::EvidenceAttached: return "evidence_attached";
    case SessionEventKind::VerificationStarted: return "verification_started";
    case SessionEventKind::VerificationCompleted: return "verification_completed";
    case SessionEventKind::SessionCompleted: return "session_completed";
    case SessionEventKind::SessionFailed: return "session_failed";
    case SessionEventKind::SessionCancelled: return "session_cancelled";
    case SessionEventKind::SessionArchived: return "session_archived";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
