#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string next_observability_id() {
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

bool signal_belongs_to_session(const std::vector<ObservabilitySignal>& signals,
                               std::string_view session_id,
                               std::string_view signal_id) {
    return std::any_of(signals.begin(), signals.end(), [&](const ObservabilitySignal& signal) {
        return signal.session_id == session_id && signal.id == signal_id;
    });
}

template <typename EventMessage>
void add_event_entries(std::vector<ForensicsTimelineEntry>& timeline,
                       const std::vector<EventMessage>& events,
                       std::string_view session_id,
                       std::string category) {
    for (const auto& event : events) {
        if (event.session_id != session_id) {
            continue;
        }
        timeline.push_back({
            event.id,
            event.session_id,
            category,
            to_string(event.kind) + ":" + event.payload,
            event.created_at
        });
    }
}

} // namespace

void SignalStore::record(const ObservabilitySignal& signal) {
    std::scoped_lock lock(mutex_);
    signals_.push_back(signal);
}

std::vector<ObservabilitySignal> SignalStore::find_by_session(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    std::vector<ObservabilitySignal> matching;
    for (const auto& signal : signals_) {
        if (signal.session_id == session_id) {
            matching.push_back(signal);
        }
    }
    return matching;
}

std::vector<ObservabilitySignal> SignalStore::list() const {
    std::scoped_lock lock(mutex_);
    return signals_;
}

ObservabilityEngineApi::ObservabilityEngineApi(const SignalStore& signal_store,
                                               const std::vector<IncidentRecord>* incidents,
                                               const std::vector<ForensicsReport>* reports,
                                               const ObservabilityMetrics* metrics)
    : signal_store_(signal_store), incidents_(incidents), reports_(reports), metrics_(metrics) {}

ApiResponse ObservabilityEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/observability-signals") {
        std::vector<std::string> values;
        for (const auto& signal : signal_store_.list()) {
            values.push_back(signal.session_id + ":" + signal.id + ":" + signal.source + ":" + signal.name);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/incidents") {
        std::vector<std::string> values;
        for (const auto& incident : *incidents_) {
            values.push_back(incident.session_id + ":" + incident.id + ":" + incident.title + ":" + to_string(incident.severity) + ":" + (incident.open ? "open" : "closed"));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/forensics-reports") {
        std::vector<std::string> values;
        for (const auto& report : *reports_) {
            values.push_back(report.session_id + ":" + report.id + ":" + to_string(report.status) + ":" + std::to_string(report.findings.size()));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/forensics-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"recorded_signals\":" << metrics_->recorded_signals << ","
            << "\"total_incidents\":" << metrics_->total_incidents << ","
            << "\"open_incidents\":" << metrics_->open_incidents << ","
            << "\"closed_incidents\":" << metrics_->closed_incidents << ","
            << "\"generated_reports\":" << metrics_->generated_reports << ","
            << "\"archived_reports\":" << metrics_->archived_reports << ","
            << "\"timeline_entries\":" << metrics_->timeline_entries
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

ObservabilityEngine::ObservabilityEngine(Runtime& runtime,
                                         StructuredLogger& logger,
                                         MetricsCollector& metrics,
                                         SessionEngine& session_engine,
                                         VerificationEngine& verification_engine,
                                         GovernanceEngine& governance_engine,
                                         PolicyAutomationEngine& policy_automation_engine,
                                         ComplianceEngine& compliance_engine)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      session_engine_(session_engine),
      verification_engine_(verification_engine),
      governance_engine_(governance_engine),
      policy_automation_engine_(policy_automation_engine),
      compliance_engine_(compliance_engine),
      events_(runtime.events()) {}

void ObservabilityEngine::record_signal(ObservabilitySignal signal) {
    if (!session_engine_.find(signal.session_id)) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for observability signal");
    }
    if (signal.id.empty()) {
        signal.id = signal.session_id + ".signal." + next_observability_id();
    }
    if (signal.summary.empty()) {
        signal.summary = signal.source + ":" + signal.name;
    }
    signal_store_.record(signal);
    emit(ObservabilityEventKind::SignalRecorded, signal.session_id, signal.id);
    refresh_metrics();
}

IncidentRecord ObservabilityEngine::open_incident(std::string_view session_id,
                                                  std::string title,
                                                  IncidentSeverity severity,
                                                  std::vector<std::string> signal_ids,
                                                  std::vector<std::string> tags,
                                                  std::string summary) {
    if (!session_engine_.find(session_id)) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for incident");
    }
    const auto signals = signal_store_.find_by_session(session_id);
    for (const auto& signal_id : signal_ids) {
        if (!signal_belongs_to_session(signals, session_id, signal_id)) {
            throw OperatorError(ErrorCode::LifecycleFailure, "incident references unknown signal");
        }
    }

    IncidentRecord incident;
    incident.id = std::string(session_id) + ".incident." + next_observability_id();
    incident.session_id = std::string(session_id);
    incident.title = std::move(title);
    incident.severity = severity;
    incident.signal_ids = std::move(signal_ids);
    incident.tags = std::move(tags);
    incident.summary = summary.empty() ? incident.title : std::move(summary);
    incident.created_at = Clock::now();
    incident.updated_at = incident.created_at;

    {
        std::scoped_lock lock(mutex_);
        incidents_.push_back(incident);
    }

    emit(ObservabilityEventKind::IncidentOpened, incident.session_id, incident.id);
    refresh_metrics();
    return incident;
}

void ObservabilityEngine::update_incident(std::string_view incident_id,
                                          std::string summary,
                                          std::vector<std::string> tags) {
    std::string session_id;
    {
        std::scoped_lock lock(mutex_);
        const auto it = std::find_if(incidents_.begin(), incidents_.end(), [&](const IncidentRecord& incident) {
            return incident.id == incident_id;
        });
        if (it == incidents_.end()) {
            throw OperatorError(ErrorCode::LifecycleFailure, "incident not found");
        }
        it->summary = std::move(summary);
        if (!tags.empty()) {
            it->tags = std::move(tags);
        }
        it->updated_at = Clock::now();
        session_id = it->session_id;
    }

    emit(ObservabilityEventKind::IncidentUpdated, session_id, std::string(incident_id));
    refresh_metrics();
}

void ObservabilityEngine::close_incident(std::string_view incident_id, std::string summary) {
    std::string session_id;
    {
        std::scoped_lock lock(mutex_);
        const auto it = std::find_if(incidents_.begin(), incidents_.end(), [&](const IncidentRecord& incident) {
            return incident.id == incident_id;
        });
        if (it == incidents_.end()) {
            throw OperatorError(ErrorCode::LifecycleFailure, "incident not found");
        }
        it->open = false;
        if (!summary.empty()) {
            it->summary = std::move(summary);
        }
        it->updated_at = Clock::now();
        it->closed_at = it->updated_at;
        session_id = it->session_id;
    }

    emit(ObservabilityEventKind::IncidentClosed, session_id, std::string(incident_id));
    refresh_metrics();
}

std::vector<ForensicsTimelineEntry> ObservabilityEngine::compile_timeline(std::string_view session_id) const {
    if (!session_engine_.find(session_id)) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for timeline");
    }

    std::vector<ForensicsTimelineEntry> timeline;
    const auto session_snapshot = session_engine_.snapshot();
    const auto verification_snapshot = verification_engine_.snapshot();
    const auto governance_snapshot = governance_engine_.snapshot();
    const auto automation_snapshot = policy_automation_engine_.snapshot();
    const auto compliance_snapshot = compliance_engine_.snapshot();

    add_event_entries(timeline, session_snapshot.events, session_id, "session");
    add_event_entries(timeline, verification_snapshot.events, session_id, "verification");
    add_event_entries(timeline, governance_snapshot.events, session_id, "governance");
    add_event_entries(timeline, automation_snapshot.events, session_id, "automation");
    add_event_entries(timeline, compliance_snapshot.events, session_id, "compliance");

    for (const auto& signal : signal_store_.find_by_session(session_id)) {
        timeline.push_back({
            signal.id,
            signal.session_id,
            "signal",
            to_string(signal.severity) + ":" + signal.summary,
            signal.created_at
        });
    }

    std::vector<IncidentRecord> incidents;
    {
        std::scoped_lock lock(mutex_);
        incidents = incidents_;
    }
    for (const auto& incident : incidents) {
        if (incident.session_id != session_id) {
            continue;
        }
        timeline.push_back({
            incident.id,
            incident.session_id,
            "incident",
            to_string(incident.severity) + ":" + incident.summary,
            incident.updated_at
        });
    }

    std::sort(timeline.begin(), timeline.end(), [](const ForensicsTimelineEntry& left, const ForensicsTimelineEntry& right) {
        if (left.occurred_at == right.occurred_at) {
            return left.id < right.id;
        }
        return left.occurred_at < right.occurred_at;
    });

    emit(ObservabilityEventKind::TimelineCompiled, std::string(session_id), std::to_string(timeline.size()));
    return timeline;
}

ForensicsReport ObservabilityEngine::generate_report(std::string_view session_id) {
    const auto started = std::chrono::steady_clock::now();
    const auto session = session_engine_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for forensics report");
    }

    ForensicsReport report;
    report.id = std::string(session_id) + ".forensics." + next_observability_id();
    report.session_id = std::string(session_id);
    report.status = ForensicsStatus::Ready;
    report.created_at = Clock::now();
    report.timeline = compile_timeline(session_id);

    const auto verification = verification_engine_.latest_result(session_id);
    const auto compliance = compliance_engine_.latest_report(session_id);
    const auto governance = governance_engine_.snapshot();
    const auto automation = policy_automation_engine_.snapshot();

    if (verification) {
        report.evidence_ids = verification->evidence_ids;
        if (verification->status != VerificationStatus::Passed) {
            report.findings.push_back("verification:" + to_string(verification->status));
        }
        for (const auto& violation : verification->violations) {
            report.findings.push_back("verification_violation:" + violation);
        }
    }

    if (compliance) {
        if (compliance->status != ComplianceStatus::Compliant) {
            report.findings.push_back("compliance:" + to_string(compliance->status));
            for (const auto& violation : compliance->violations) {
                report.findings.push_back("compliance_violation:" + violation);
            }
        }
    }

    for (const auto& review : governance.reviews) {
        if (review.session_id == session_id && review.decision != GovernanceDecision::Approved) {
            report.findings.push_back("governance:" + to_string(review.decision));
        }
    }

    for (const auto& evaluation : automation.evaluations) {
        if (evaluation.session_id == session_id && evaluation.decision != PolicyAutomationDecision::AutoApprove) {
            report.findings.push_back("automation:" + to_string(evaluation.decision));
        }
    }

    {
        std::scoped_lock lock(mutex_);
        for (const auto& incident : incidents_) {
            if (incident.session_id == session_id) {
                report.related_incidents.push_back(incident.id);
                if (incident.open) {
                    report.findings.push_back("open_incident:" + incident.id);
                }
            }
        }
    }

    if (report.findings.empty()) {
        report.findings.push_back("no_anomalies_detected");
    }
    report.summary = summarize_report(report);

    {
        std::scoped_lock lock(mutex_);
        reports_.push_back(report);
    }

    emit(ObservabilityEventKind::ReportGenerated, report.session_id, report.id);
    refresh_metrics(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started));
    return report;
}

void ObservabilityEngine::archive_report(std::string_view report_id) {
    std::string session_id;
    {
        std::scoped_lock lock(mutex_);
        const auto it = std::find_if(reports_.begin(), reports_.end(), [&](const ForensicsReport& report) {
            return report.id == report_id;
        });
        if (it == reports_.end()) {
            throw OperatorError(ErrorCode::LifecycleFailure, "forensics report not found");
        }
        it->status = ForensicsStatus::Archived;
        it->archived_at = Clock::now();
        session_id = it->session_id;
    }

    emit(ObservabilityEventKind::ReportArchived, session_id, std::string(report_id));
    refresh_metrics();
}

std::optional<ForensicsReport> ObservabilityEngine::latest_report(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    for (auto it = reports_.rbegin(); it != reports_.rend(); ++it) {
        if (it->session_id == session_id) {
            return *it;
        }
    }
    return std::nullopt;
}

ObservabilitySnapshot ObservabilityEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {signal_store_.list(), incidents_, reports_, events_.history(), observability_metrics_};
}

ObservabilityEngineApi ObservabilityEngine::api() const {
    return ObservabilityEngineApi{signal_store_, &incidents_, &reports_, &observability_metrics_};
}

IncidentRecord ObservabilityEngine::require_incident(std::string_view incident_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = std::find_if(incidents_.begin(), incidents_.end(), [&](const IncidentRecord& incident) {
        return incident.id == incident_id;
    });
    if (it == incidents_.end()) {
        throw OperatorError(ErrorCode::LifecycleFailure, "incident not found");
    }
    return *it;
}

std::string ObservabilityEngine::summarize_report(const ForensicsReport& report) {
    std::ostringstream out;
    out << to_string(report.status) << " with "
        << report.timeline.size() << " timeline event(s) and "
        << report.findings.size() << " finding(s)";
    return out.str();
}

void ObservabilityEngine::emit(ObservabilityEventKind kind,
                               std::string session_id,
                               std::string payload) const {
    events_.emit({next_observability_id(), kind, std::move(session_id), std::move(payload), Clock::now()});
}

void ObservabilityEngine::refresh_metrics(std::chrono::milliseconds duration) {
    ObservabilityMetrics refreshed;
    std::vector<IncidentRecord> incidents;
    std::vector<ForensicsReport> reports;
    {
        std::scoped_lock lock(mutex_);
        incidents = incidents_;
        reports = reports_;
    }

    refreshed.recorded_signals = signal_store_.list().size();
    refreshed.total_incidents = incidents.size();
    refreshed.generated_reports = reports.size();
    for (const auto& incident : incidents) {
        if (incident.open) {
            ++refreshed.open_incidents;
        } else {
            ++refreshed.closed_incidents;
        }
    }
    for (const auto& report : reports) {
        refreshed.timeline_entries += report.timeline.size();
        if (report.status == ForensicsStatus::Archived) {
            ++refreshed.archived_reports;
        }
    }

    if (!reports.empty() && duration.count() > 0) {
        if (observability_metrics_.average_report_time.count() == 0) {
            refreshed.average_report_time = duration;
        } else {
            const auto prior = observability_metrics_.average_report_time.count() * static_cast<long long>(reports.size() - 1);
            refreshed.average_report_time = std::chrono::milliseconds((prior + duration.count()) / static_cast<long long>(reports.size()));
        }
    } else {
        refreshed.average_report_time = observability_metrics_.average_report_time;
    }

    observability_metrics_ = refreshed;
    metrics_.record_build_statistic("observability_signals", static_cast<double>(refreshed.recorded_signals));
    metrics_.record_build_statistic("observability_incidents", static_cast<double>(refreshed.total_incidents));
    metrics_.record_build_statistic("forensics_reports", static_cast<double>(refreshed.generated_reports));
}

} // namespace exotic::codex_operator
