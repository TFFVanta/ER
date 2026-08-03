#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::string event_type_for(ObservabilityEventKind kind) {
    switch (kind) {
    case ObservabilityEventKind::SignalRecorded: return "observability.signal_recorded";
    case ObservabilityEventKind::IncidentOpened: return "observability.incident_opened";
    case ObservabilityEventKind::IncidentUpdated: return "observability.incident_updated";
    case ObservabilityEventKind::IncidentClosed: return "observability.incident_closed";
    case ObservabilityEventKind::TimelineCompiled: return "observability.timeline_compiled";
    case ObservabilityEventKind::ReportGenerated: return "observability.report_generated";
    case ObservabilityEventKind::ReportArchived: return "observability.report_archived";
    }
    return "observability.unknown";
}

} // namespace

ObservabilityEventStream::ObservabilityEventStream(EventBus& bus) : bus_(bus) {}

void ObservabilityEventStream::emit(const ObservabilityEventMessage& event) const {
    Event runtime_event;
    runtime_event.type = event_type_for(event.kind);
    runtime_event.payload["session_id"] = event.session_id;
    runtime_event.payload["payload"] = event.payload;
    bus_.publish(runtime_event);

    std::scoped_lock lock(mutex_);
    history_.push_back(event);
}

std::vector<ObservabilityEventMessage> ObservabilityEventStream::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

std::string to_string(IncidentSeverity value) {
    switch (value) {
    case IncidentSeverity::Info: return "info";
    case IncidentSeverity::Warning: return "warning";
    case IncidentSeverity::Error: return "error";
    case IncidentSeverity::Critical: return "critical";
    }
    return "unknown";
}

std::string to_string(ForensicsStatus value) {
    switch (value) {
    case ForensicsStatus::Pending: return "pending";
    case ForensicsStatus::Ready: return "ready";
    case ForensicsStatus::Archived: return "archived";
    }
    return "unknown";
}

std::string to_string(ObservabilityEventKind value) {
    switch (value) {
    case ObservabilityEventKind::SignalRecorded: return "signal_recorded";
    case ObservabilityEventKind::IncidentOpened: return "incident_opened";
    case ObservabilityEventKind::IncidentUpdated: return "incident_updated";
    case ObservabilityEventKind::IncidentClosed: return "incident_closed";
    case ObservabilityEventKind::TimelineCompiled: return "timeline_compiled";
    case ObservabilityEventKind::ReportGenerated: return "report_generated";
    case ObservabilityEventKind::ReportArchived: return "report_archived";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
