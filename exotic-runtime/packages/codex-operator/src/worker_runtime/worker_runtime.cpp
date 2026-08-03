#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

std::shared_ptr<Worker> make_worker(std::string id, WorkerKind kind, PromptTemplateKind template_kind) {
    WorkerRegistration registration;
    registration.id = std::move(id);
    registration.kind = kind;
    registration.version = "1.0.0";
    registration.capabilities.supported_objective_types = {template_kind};
    registration.capabilities.required_tools = {"prompt-compiler"};
    registration.capabilities.required_permissions = {"workspace.read"};
    registration.capabilities.resource_requirements = {"cpu", "memory"};
    registration.capabilities.estimated_execution_cost = 1.0;
    registration.capabilities.estimated_execution_time = std::chrono::milliseconds(250);
    registration.capabilities.maximum_concurrency = 2;
    registration.capabilities.reliability_score = 0.9;
    registration.cost_per_execution = 1.0;
    registration.trust_score = 0.9;
    return std::make_shared<CallbackWorker>(std::move(registration), [](const WorkerAssignment& assignment) {
        return WorkerResult{assignment.id, assignment.worker_id, true, "completed " + assignment.objective.title, {assignment.prompt.checksum}, std::chrono::milliseconds(25)};
    });
}

} // namespace

WorkerRuntime::WorkerRuntime(Runtime& runtime,
                             StructuredLogger& logger,
                             MetricsCollector& metrics)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      messages_(runtime.events()),
      engine_(logger, metrics, registry_, messages_, state_store_) {}

void WorkerRuntime::register_default_workers() {
    register_worker(make_worker("architect-1", WorkerKind::Architect, PromptTemplateKind::Architecture));
    register_worker(make_worker("planner-1", WorkerKind::Planner, PromptTemplateKind::Research));
    register_worker(make_worker("builder-1", WorkerKind::Builder, PromptTemplateKind::FeatureImplementation));
    register_worker(make_worker("tester-1", WorkerKind::Tester, PromptTemplateKind::Testing));
    register_worker(make_worker("reviewer-1", WorkerKind::Reviewer, PromptTemplateKind::BugFix));
    register_worker(make_worker("optimizer-1", WorkerKind::Optimizer, PromptTemplateKind::Optimization));
    register_worker(make_worker("documenter-1", WorkerKind::Documenter, PromptTemplateKind::Documentation));
    register_worker(make_worker("security-1", WorkerKind::Security, PromptTemplateKind::Security));
    register_worker(make_worker("researcher-1", WorkerKind::Researcher, PromptTemplateKind::Research));
    register_worker(make_worker("refactoring-1", WorkerKind::Refactoring, PromptTemplateKind::Refactoring));
    register_worker(make_worker("integration-1", WorkerKind::Integration, PromptTemplateKind::Integration));
    register_worker(make_worker("deployment-1", WorkerKind::Deployment, PromptTemplateKind::Migration));
    register_worker(make_worker("archivist-1", WorkerKind::Archivist, PromptTemplateKind::Documentation));
    register_worker(make_worker("operator-1", WorkerKind::Operator, PromptTemplateKind::Performance));
}

void WorkerRuntime::register_worker(std::shared_ptr<Worker> worker) {
    auto registration = worker->registration();
    registry_.register_worker(std::move(worker));
    state_store_.update({registration.id, WorkerHealthStatus::Healthy, WorkerAvailability::Available, std::nullopt, 0U, Clock::now(), 0U, 0U});
}

void WorkerRuntime::submit(WorkerAssignment assignment) {
    engine_.submit(std::move(assignment));
}

WorkerResult WorkerRuntime::execute_next() {
    return engine_.run_one(dispatcher_);
}

std::vector<WorkerResult> WorkerRuntime::execute_all(ExecutionMode mode) {
    return engine_.run_all(dispatcher_, mode);
}

void WorkerRuntime::cancel(std::string_view assignment_id) {
    engine_.cancel(assignment_id);
}

void WorkerRuntime::pause() {
    engine_.pause();
}

void WorkerRuntime::resume() {
    engine_.resume();
}

void WorkerRuntime::heartbeat(std::string_view worker_id) {
    engine_.heartbeat(worker_id);
}

WorkerRuntimeSnapshot WorkerRuntime::snapshot() const {
    return {registry_.list(), state_store_.list(), engine_.queue_snapshot(), engine_.metrics_snapshot()};
}

WorkerRuntimeApi WorkerRuntime::api() const {
    return WorkerRuntimeApi{registry_, state_store_, engine_};
}

WorkerRegistry& WorkerRuntime::registry() noexcept {
    return registry_;
}

WorkerExecutionEngine& WorkerRuntime::engine() noexcept {
    return engine_;
}

std::string to_string(WorkerKind value) {
    switch (value) {
    case WorkerKind::Architect: return "architect";
    case WorkerKind::Planner: return "planner";
    case WorkerKind::Builder: return "builder";
    case WorkerKind::Tester: return "tester";
    case WorkerKind::Reviewer: return "reviewer";
    case WorkerKind::Optimizer: return "optimizer";
    case WorkerKind::Documenter: return "documenter";
    case WorkerKind::Security: return "security";
    case WorkerKind::Researcher: return "researcher";
    case WorkerKind::Refactoring: return "refactoring";
    case WorkerKind::Integration: return "integration";
    case WorkerKind::Deployment: return "deployment";
    case WorkerKind::Archivist: return "archivist";
    case WorkerKind::Operator: return "operator";
    }
    return "unknown";
}

std::string to_string(WorkerHealthStatus value) {
    switch (value) {
    case WorkerHealthStatus::Healthy: return "healthy";
    case WorkerHealthStatus::Degraded: return "degraded";
    case WorkerHealthStatus::Unhealthy: return "unhealthy";
    case WorkerHealthStatus::Quarantined: return "quarantined";
    }
    return "unknown";
}

std::string to_string(WorkerAvailability value) {
    switch (value) {
    case WorkerAvailability::Available: return "available";
    case WorkerAvailability::Busy: return "busy";
    case WorkerAvailability::Paused: return "paused";
    case WorkerAvailability::Offline: return "offline";
    }
    return "unknown";
}

std::string to_string(AssignmentStatus value) {
    switch (value) {
    case AssignmentStatus::Queued: return "queued";
    case AssignmentStatus::Assigned: return "assigned";
    case AssignmentStatus::Running: return "running";
    case AssignmentStatus::WaitingRetry: return "waiting_retry";
    case AssignmentStatus::Completed: return "completed";
    case AssignmentStatus::Failed: return "failed";
    case AssignmentStatus::Cancelled: return "cancelled";
    case AssignmentStatus::DeadLettered: return "dead_lettered";
    }
    return "unknown";
}

std::string to_string(ExecutionMode value) {
    switch (value) {
    case ExecutionMode::Sequential: return "sequential";
    case ExecutionMode::Parallel: return "parallel";
    case ExecutionMode::DependencyAware: return "dependency_aware";
    }
    return "unknown";
}

std::string to_string(WorkerMessageKind value) {
    switch (value) {
    case WorkerMessageKind::ObjectiveAssigned: return "objective_assigned";
    case WorkerMessageKind::ObjectiveStarted: return "objective_started";
    case WorkerMessageKind::ProgressUpdated: return "progress_updated";
    case WorkerMessageKind::EvidenceProduced: return "evidence_produced";
    case WorkerMessageKind::VerificationRequested: return "verification_requested";
    case WorkerMessageKind::VerificationCompleted: return "verification_completed";
    case WorkerMessageKind::WorkerFailed: return "worker_failed";
    case WorkerMessageKind::WorkerRecovered: return "worker_recovered";
    case WorkerMessageKind::ObjectiveCompleted: return "objective_completed";
    case WorkerMessageKind::ApprovalRequested: return "approval_requested";
    case WorkerMessageKind::ApprovalReceived: return "approval_received";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
