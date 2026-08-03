#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

namespace {

WorkerRegistration make_registration(std::string id, WorkerKind kind, PromptTemplateKind type) {
    WorkerRegistration registration;
    registration.id = std::move(id);
    registration.kind = kind;
    registration.version = "1.0.0";
    registration.capabilities.supported_objective_types = {type};
    registration.capabilities.required_tools = {"event-bus", "prompt-compiler"};
    registration.capabilities.required_permissions = {"workspace.read"};
    registration.capabilities.resource_requirements = {"cpu", "memory"};
    registration.capabilities.estimated_execution_cost = 1.0;
    registration.capabilities.estimated_execution_time = std::chrono::milliseconds(500);
    registration.capabilities.maximum_concurrency = 2;
    registration.capabilities.reliability_score = 0.95;
    registration.cost_per_execution = 1.0;
    registration.trust_score = 0.9;
    return registration;
}

std::shared_ptr<Worker> make_default_worker(std::string id, WorkerKind kind, PromptTemplateKind type) {
    return std::make_shared<CallbackWorker>(make_registration(std::move(id), kind, type), [](const WorkerAssignment& assignment) {
        WorkerResult result;
        result.success = true;
        result.summary = "completed " + assignment.objective.title;
        result.evidence = {assignment.prompt.checksum};
        return result;
    });
}

} // namespace

} // namespace exotic::codex_operator
