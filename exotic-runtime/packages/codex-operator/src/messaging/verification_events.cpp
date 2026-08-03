#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(VerificationEventKind kind) {
    switch (kind) {
    case VerificationEventKind::VerificationRequested: return "verification.requested";
    case VerificationEventKind::EvidenceRecorded: return "verification.evidence_recorded";
    case VerificationEventKind::VerificationStarted: return "verification.started";
    case VerificationEventKind::VerificationPassed: return "verification.passed";
    case VerificationEventKind::VerificationFailed: return "verification.failed";
    }
    return "verification.unknown";
}

} // namespace

VerificationEventStream::VerificationEventStream(EventBus& bus) : bus_(bus) {}

void VerificationEventStream::emit(const VerificationEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<VerificationEventMessage> VerificationEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(VerificationEventKind value) {
    switch (value) {
    case VerificationEventKind::VerificationRequested: return "verification_requested";
    case VerificationEventKind::EvidenceRecorded: return "evidence_recorded";
    case VerificationEventKind::VerificationStarted: return "verification_started";
    case VerificationEventKind::VerificationPassed: return "verification_passed";
    case VerificationEventKind::VerificationFailed: return "verification_failed";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
