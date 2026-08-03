#include "exotic/codex_operator/operator.hpp"

#include <algorithm>

namespace exotic::codex_operator {

CallbackWorker::CallbackWorker(WorkerRegistration registration, WorkerHandler handler)
    : registration_(std::move(registration)), handler_(std::move(handler)) {}

WorkerRegistration CallbackWorker::registration() const {
    return registration_;
}

WorkerResult CallbackWorker::execute(const WorkerAssignment& assignment) {
    return handler_(assignment);
}

void WorkerRegistry::register_worker(std::shared_ptr<Worker> worker) {
    if (!worker) {
        throw OperatorError(ErrorCode::DependencyResolutionFailure, "cannot register null worker");
    }
    auto registration = worker->registration();
    std::scoped_lock lock(mutex_);
    if (workers_.contains(registration.id)) {
        throw OperatorError(ErrorCode::DuplicateService, "duplicate worker: " + registration.id);
    }
    workers_[registration.id] = std::move(worker);
    registrations_[registration.id] = std::move(registration);
}

std::shared_ptr<Worker> WorkerRegistry::find(std::string_view worker_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = workers_.find(std::string(worker_id));
    return it == workers_.end() ? nullptr : it->second;
}

std::vector<WorkerRegistration> WorkerRegistry::list() const {
    std::scoped_lock lock(mutex_);
    std::vector<WorkerRegistration> result;
    result.reserve(registrations_.size());
    for (const auto& [id, registration] : registrations_) {
        (void)id;
        result.push_back(registration);
    }
    return result;
}

std::vector<WorkerRegistration> WorkerRegistry::discover(PromptTemplateKind objective_type) const {
    std::vector<WorkerRegistration> result;
    for (const auto& registration : list()) {
        if (registration.availability == WorkerAvailability::Offline ||
            registration.health_status == WorkerHealthStatus::Quarantined) {
            continue;
        }
        if (std::find(registration.capabilities.supported_objective_types.begin(),
                      registration.capabilities.supported_objective_types.end(),
                      objective_type) != registration.capabilities.supported_objective_types.end()) {
            result.push_back(registration);
        }
    }
    return result;
}

void WorkerRegistry::update_health(std::string_view worker_id,
                                   WorkerHealthStatus status,
                                   WorkerAvailability availability) {
    std::scoped_lock lock(mutex_);
    auto it = registrations_.find(std::string(worker_id));
    if (it == registrations_.end()) {
        return;
    }
    it->second.health_status = status;
    it->second.availability = availability;
}

void WorkerRegistry::record_result(const WorkerResult& result) {
    std::scoped_lock lock(mutex_);
    auto it = registrations_.find(result.worker_id);
    if (it == registrations_.end()) {
        return;
    }
    auto& performance = it->second.performance;
    if (result.success) {
        ++performance.completed_assignments;
    } else {
        ++performance.failed_assignments;
    }
    const auto total = performance.completed_assignments + performance.failed_assignments;
    if (total == 1) {
        performance.average_latency = result.duration;
    } else {
        const auto combined = (performance.average_latency.count() * static_cast<long long>(total - 1)) + result.duration.count();
        performance.average_latency = std::chrono::milliseconds(combined / static_cast<long long>(total));
    }
}

} // namespace exotic::codex_operator
