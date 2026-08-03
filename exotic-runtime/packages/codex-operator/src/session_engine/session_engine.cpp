#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string checksum_fragment(std::string_view value) {
    std::uint64_t hash = 1469598103934665603ULL;
    for (const unsigned char ch : value) {
        hash ^= ch;
        hash *= 1099511628211ULL;
    }

    std::ostringstream out;
    out << std::hex << hash;
    return out.str();
}

std::string next_message_id() {
    return std::to_string(std::chrono::duration_cast<std::chrono::microseconds>(
        Clock::now().time_since_epoch()).count());
}

std::string make_session_id(const PromptCompilerInput& input, const CompiledPrompt& compiled) {
    return input.objective.id + "-" + compiled.checksum.substr(0, std::min<std::size_t>(12, compiled.checksum.size()));
}

std::string make_assignment_id(std::string_view session_id) {
    return std::string(session_id) + ".root";
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

SessionEngineApi::SessionEngineApi(const SessionStore& store,
                                   const std::vector<SessionCheckpoint>* checkpoints,
                                   const SessionEngineMetrics* metrics)
    : store_(store), checkpoints_(checkpoints), metrics_(metrics) {}

ApiResponse SessionEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/sessions") {
        std::vector<std::string> values;
        for (const auto& session : store_.list()) {
            values.push_back(session.id + ":" + to_string(session.status));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/session-checkpoints") {
        std::vector<std::string> values;
        for (const auto& checkpoint : *checkpoints_) {
            values.push_back(checkpoint.session_id + ":" + checkpoint.id);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/session-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"active_sessions\":" << metrics_->active_sessions << ","
            << "\"total_sessions\":" << metrics_->total_sessions << ","
            << "\"completed_sessions\":" << metrics_->completed_sessions << ","
            << "\"failed_sessions\":" << metrics_->failed_sessions << ","
            << "\"cancelled_sessions\":" << metrics_->cancelled_sessions << ","
            << "\"approval_waits\":" << metrics_->approval_waits
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

SessionEngine::SessionEngine(Runtime& runtime,
                             StructuredLogger& logger,
                             MetricsCollector& metrics,
                             std::unique_ptr<PromptCompiler> prompt_compiler,
                             std::unique_ptr<WorkerRuntime> worker_runtime)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      prompt_compiler_(std::move(prompt_compiler)),
      worker_runtime_(std::move(worker_runtime)),
      events_(runtime.events()) {}

SessionRecord SessionEngine::create_session(const PromptCompilerInput& input) {
    auto compiled = prompt_compiler_->compile(input);
    SessionRecord session;
    session.id = make_session_id(input, compiled);
    session.objective_id = input.objective.id;
    session.branch = input.repository_state.current_branch;
    session.status = input.constraints.approval_required ? SessionStatus::WaitingApproval : SessionStatus::Ready;
    session.objective = input.objective;
    session.constraints = input.constraints;
    session.compiled_prompt = std::move(compiled);
    session.referenced_files = session.compiled_prompt.referenced_files;
    session.metadata = session.compiled_prompt.metadata;
    session.metadata["session_checksum"] = checksum_fragment(session.id + session.compiled_prompt.checksum);
    session.metadata["subsystem"] = input.objective.subsystem;
    session.metadata["objective_title"] = input.objective.title;
    session.metadata["objective_description"] = input.objective.description;
    session.metadata["template_kind"] = to_string(input.objective.template_kind);
    session.updated_at = Clock::now();
    session.assignment_ids.push_back(make_assignment_id(session.id));

    persist(session);
    emit(SessionEventKind::SessionCreated, session.id, session.objective_id, "session created");
    emit(SessionEventKind::PromptCompiled, session.id, session.objective_id, session.compiled_prompt.checksum);
    checkpoint(session.id, "session created");
    logger_.info("session-engine", "created session", {{"session_id", session.id}, {"objective", session.objective_id}});
    return require_session(session.id);
}

std::vector<WorkerResult> SessionEngine::run_session(std::string_view session_id, ExecutionMode mode) {
    auto session = require_session(session_id);
    if (session.status == SessionStatus::WaitingApproval) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session requires approval before execution");
    }
    if (session.status == SessionStatus::Cancelled || session.status == SessionStatus::Archived) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session is not executable");
    }

    session.status = SessionStatus::Running;
    session.updated_at = Clock::now();
    persist(session);

    for (const auto& assignment_id : session.assignment_ids) {
        WorkerAssignment assignment;
        assignment.id = assignment_id;
        assignment.objective = session.objective;
        assignment.prompt = session.compiled_prompt;
        assignment.timeout = std::max(session.compiled_prompt.estimated_runtime, std::chrono::milliseconds(30000));
        worker_runtime_->submit(std::move(assignment));
        emit(SessionEventKind::AssignmentQueued, session.id, session.objective_id, assignment_id);
    }

    emit(SessionEventKind::SessionStarted, session.id, session.objective_id, to_string(mode));

    std::vector<WorkerResult> results;
    results.reserve(session.assignment_ids.size());
    for (std::size_t index = 0; index < session.assignment_ids.size(); ++index) {
        results.push_back(worker_runtime_->execute_next());
    }
    session = require_session(session_id);
    session.status = SessionStatus::Verifying;
    session.updated_at = Clock::now();
    persist(session);
    emit(SessionEventKind::VerificationStarted, session.id, session.objective_id, "verifying worker output");

    bool success = !results.empty();
    for (const auto& result : results) {
        success = success && result.success;
        if (!result.evidence.empty()) {
            SessionEvidenceRecord evidence;
            evidence.id = session.id + ":" + result.worker_id + ":" + std::to_string(session.evidence.size() + 1);
            evidence.summary = result.summary;
            evidence.files = result.evidence;
            evidence.worker_id = result.worker_id;
            attach_evidence(session.id, std::move(evidence));
        }
    }

    session = require_session(session_id);
    session.status = success ? SessionStatus::Completed : SessionStatus::Failed;
    session.updated_at = Clock::now();
    session.completed_at = Clock::now();
    persist(session);

    emit(SessionEventKind::VerificationCompleted, session.id, session.objective_id, success ? "passed" : "failed");
    emit(success ? SessionEventKind::SessionCompleted : SessionEventKind::SessionFailed,
         session.id,
         session.objective_id,
         success ? "session completed" : "session failed");
    checkpoint(session.id, success ? "session completed" : "session failed");
    refresh_metrics();
    return results;
}

void SessionEngine::request_approval(std::string_view session_id, std::string reason) {
    auto session = require_session(session_id);
    session.status = SessionStatus::WaitingApproval;
    session.approval_request = std::move(reason);
    session.updated_at = Clock::now();
    persist(session);
    emit(SessionEventKind::ApprovalRequested, session.id, session.objective_id, *session.approval_request);
    refresh_metrics();
}

void SessionEngine::record_approval(std::string_view session_id, bool approved, std::string reviewer) {
    auto session = require_session(session_id);
    session.approval_reviewer = std::move(reviewer);
    session.updated_at = Clock::now();
    if (approved) {
        session.status = session.completed_at ? SessionStatus::Completed : SessionStatus::Ready;
        session.approval_request.reset();
        emit(SessionEventKind::ApprovalReceived, session.id, session.objective_id, "approved");
    } else {
        session.status = SessionStatus::Cancelled;
        session.completed_at = Clock::now();
        emit(SessionEventKind::SessionCancelled, session.id, session.objective_id, "approval denied");
    }
    persist(session);
    checkpoint(session.id, approved ? "approval granted" : "approval denied");
    refresh_metrics();
}

void SessionEngine::attach_evidence(std::string_view session_id, SessionEvidenceRecord evidence) {
    auto session = require_session(session_id);
    session.evidence.push_back(std::move(evidence));
    session.updated_at = Clock::now();
    const auto evidence_id = session.evidence.back().id;
    persist(session);
    emit(SessionEventKind::EvidenceAttached, session.id, session.objective_id, evidence_id);
}

SessionCheckpoint SessionEngine::checkpoint(std::string_view session_id, std::string summary) {
    const auto session = require_session(session_id);
    SessionCheckpoint checkpoint;
    checkpoint.session_id = session.id;
    checkpoint.status = session.status;
    checkpoint.prompt_checksum = session.compiled_prompt.checksum;
    checkpoint.assignment_ids = session.assignment_ids;
    checkpoint.summary = std::move(summary);
    for (const auto& evidence : session.evidence) {
        checkpoint.evidence_ids.push_back(evidence.id);
    }

    std::scoped_lock lock(mutex_);
    checkpoint.id = session.id + ".checkpoint." + std::to_string(checkpoints_.size() + 1);
    checkpoints_.push_back(checkpoint);
    return checkpoint;
}

void SessionEngine::cancel_session(std::string_view session_id) {
    auto session = require_session(session_id);
    for (const auto& assignment_id : session.assignment_ids) {
        worker_runtime_->cancel(assignment_id);
    }
    session.status = SessionStatus::Cancelled;
    session.updated_at = Clock::now();
    session.completed_at = Clock::now();
    persist(session);
    emit(SessionEventKind::SessionCancelled, session.id, session.objective_id, "cancelled");
    checkpoint(session.id, "session cancelled");
    refresh_metrics();
}

void SessionEngine::archive_session(std::string_view session_id) {
    auto session = require_session(session_id);
    session.status = SessionStatus::Archived;
    session.updated_at = Clock::now();
    persist(session);
    emit(SessionEventKind::SessionArchived, session.id, session.objective_id, "archived");
    checkpoint(session.id, "session archived");
    refresh_metrics();
}

std::optional<SessionRecord> SessionEngine::find(std::string_view session_id) const {
    return store_.find(session_id);
}

SessionEngineSnapshot SessionEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {store_.list(), checkpoints_, events_.history(), engine_metrics_};
}

SessionEngineApi SessionEngine::api() const {
    return SessionEngineApi{store_, &checkpoints_, &engine_metrics_};
}

PromptCompiler& SessionEngine::prompt_compiler() noexcept {
    return *prompt_compiler_;
}

WorkerRuntime& SessionEngine::worker_runtime() noexcept {
    return *worker_runtime_;
}

SessionRecord SessionEngine::require_session(std::string_view session_id) const {
    const auto session = store_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found");
    }
    return *session;
}

void SessionEngine::persist(SessionRecord session) {
    session.updated_at = Clock::now();
    store_.upsert(session);
    refresh_metrics();
}

void SessionEngine::emit(SessionEventKind kind,
                         std::string session_id,
                         std::string objective_id,
                         std::string payload) {
    events_.emit({next_message_id(), kind, std::move(session_id), std::move(objective_id), std::move(payload), Clock::now()});
}

void SessionEngine::refresh_metrics() {
    const auto sessions = store_.list();
    SessionEngineMetrics refreshed;
    refreshed.total_sessions = sessions.size();

    std::chrono::milliseconds total_duration{0};
    std::size_t timed_sessions = 0;
    for (const auto& session : sessions) {
        switch (session.status) {
        case SessionStatus::Created:
        case SessionStatus::Ready:
        case SessionStatus::Running:
        case SessionStatus::Verifying:
            ++refreshed.active_sessions;
            break;
        case SessionStatus::WaitingApproval:
            ++refreshed.active_sessions;
            ++refreshed.approval_waits;
            break;
        case SessionStatus::Completed:
            ++refreshed.completed_sessions;
            break;
        case SessionStatus::Failed:
            ++refreshed.failed_sessions;
            break;
        case SessionStatus::Cancelled:
            ++refreshed.cancelled_sessions;
            break;
        case SessionStatus::Archived:
            break;
        }

        if (session.completed_at) {
            total_duration += std::chrono::duration_cast<std::chrono::milliseconds>(*session.completed_at - session.created_at);
            ++timed_sessions;
        }
    }

    if (timed_sessions != 0) {
        refreshed.average_session_time = total_duration / static_cast<int>(timed_sessions);
    }

    {
        std::scoped_lock lock(mutex_);
        engine_metrics_ = refreshed;
    }
    metrics_.record_build_statistic("session_total", static_cast<double>(refreshed.total_sessions));
    metrics_.record_build_statistic("session_active", static_cast<double>(refreshed.active_sessions));
}

} // namespace exotic::codex_operator
