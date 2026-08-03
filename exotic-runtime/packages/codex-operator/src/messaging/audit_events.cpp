#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(AuditEventKind kind) {
    switch (kind) {
    case AuditEventKind::AuditRecorded: return "audit.recorded";
    case AuditEventKind::ComplianceChecked: return "audit.compliance_checked";
    case AuditEventKind::CompliancePassed: return "audit.compliance_passed";
    case AuditEventKind::ComplianceFailed: return "audit.compliance_failed";
    case AuditEventKind::AuditExported: return "audit.exported";
    }
    return "audit.unknown";
}

} // namespace

AuditEventStream::AuditEventStream(EventBus& bus) : bus_(bus) {}

void AuditEventStream::emit(const AuditEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<AuditEventMessage> AuditEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(ComplianceStatus value) {
    switch (value) {
    case ComplianceStatus::Unknown: return "unknown";
    case ComplianceStatus::Compliant: return "compliant";
    case ComplianceStatus::NonCompliant: return "non_compliant";
    case ComplianceStatus::NeedsReview: return "needs_review";
    }
    return "unknown";
}

std::string to_string(AuditEventKind value) {
    switch (value) {
    case AuditEventKind::AuditRecorded: return "audit_recorded";
    case AuditEventKind::ComplianceChecked: return "compliance_checked";
    case AuditEventKind::CompliancePassed: return "compliance_passed";
    case AuditEventKind::ComplianceFailed: return "compliance_failed";
    case AuditEventKind::AuditExported: return "audit_exported";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
