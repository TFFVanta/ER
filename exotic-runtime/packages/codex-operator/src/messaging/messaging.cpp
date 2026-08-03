#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(WorkerMessageKind kind) {
    switch (kind) {
    case WorkerMessageKind::ObjectiveAssigned: return "worker.objective_assigned";
    case WorkerMessageKind::ObjectiveStarted: return "worker.objective_started";
    case WorkerMessageKind::ProgressUpdated: return "worker.progress_updated";
    case WorkerMessageKind::EvidenceProduced: return "worker.evidence_produced";
    case WorkerMessageKind::VerificationRequested: return "worker.verification_requested";
    case WorkerMessageKind::VerificationCompleted: return "worker.verification_completed";
    case WorkerMessageKind::WorkerFailed: return "worker.failed";
    case WorkerMessageKind::WorkerRecovered: return "worker.recovered";
    case WorkerMessageKind::ObjectiveCompleted: return "worker.objective_completed";
    case WorkerMessageKind::ApprovalRequested: return "worker.approval_requested";
    case WorkerMessageKind::ApprovalReceived: return "worker.approval_received";
    }
    return "worker.unknown";
}

} // namespace

WorkerMessageBus::WorkerMessageBus(EventBus& bus) : bus_(bus) {}

void WorkerMessageBus::emit(const WorkerMessage& message) const {
    Event event;
    event.type = event_type_for(message.kind);
    event.payload["assignment_id"] = message.assignment_id;
    event.payload["worker_id"] = message.worker_id;
    event.payload["objective_id"] = message.objective_id;
    event.payload["payload"] = message.payload;
    bus_.publish(event);
    std::scoped_lock lock(mutex_);
    history_.push_back(message);
}

std::vector<WorkerMessage> WorkerMessageBus::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

} // namespace exotic::codex_operator
