#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

void HealthMonitor::observe(runtime::ServiceHealth health) {
    std::scoped_lock lock(mutex_);
    services_[health.service] = std::move(health);
}

void HealthMonitor::record_dependency_failure(std::string message) {
    std::scoped_lock lock(mutex_);
    dependency_failures_.push_back(std::move(message));
}

void HealthMonitor::clear_dependency_failures() {
    std::scoped_lock lock(mutex_);
    dependency_failures_.clear();
}

HealthSummary HealthMonitor::summary() const {
    std::scoped_lock lock(mutex_);
    HealthSummary summary;
    summary.healthy = dependency_failures_.empty();
    summary.ready = !services_.empty();
    summary.dependency_failures = dependency_failures_;
    for (const auto& [name, health] : services_) {
        (void)name;
        summary.services.push_back(health);
        const auto healthy = health.level == runtime::HealthLevel::Healthy || health.level == runtime::HealthLevel::Degraded;
        summary.healthy = summary.healthy && healthy;
        summary.ready = summary.ready && health.state == runtime::ServiceState::Running && healthy;
    }
    return summary;
}

OperatorRuntimeService::OperatorRuntimeService(ServiceRegistration registration)
    : registration_(std::move(registration)) {}

std::string OperatorRuntimeService::name() const {
    return registration_.name;
}

std::vector<std::string> OperatorRuntimeService::dependencies() const {
    return registration_.dependencies;
}

void OperatorRuntimeService::recover() {
    if (registration_.recover) {
        registration_.recover();
    }
}

void OperatorRuntimeService::start() {
    if (registration_.start) {
        registration_.start();
    }
}

void OperatorRuntimeService::request_stop() {
    if (registration_.request_stop) {
        registration_.request_stop();
    }
}

void OperatorRuntimeService::join() {
    if (registration_.join) {
        registration_.join();
    }
}

runtime::ServiceHealth OperatorRuntimeService::health() {
    if (registration_.health) {
        return registration_.health();
    }
    runtime::ServiceHealth health;
    health.service = registration_.name;
    health.state = runtime::ServiceState::Running;
    health.level = runtime::HealthLevel::Healthy;
    health.message = "service has no explicit health callback";
    return health;
}

void OperatorServiceRegistry::add(std::shared_ptr<runtime::RuntimeService> service) {
    if (!service) {
        throw OperatorError(ErrorCode::DuplicateService, "cannot register null service");
    }
    if (services_.contains(service->name())) {
        throw OperatorError(ErrorCode::DuplicateService, "duplicate service: " + service->name());
    }
    graph_.add(service);
    services_[service->name()] = std::move(service);
}

bool OperatorServiceRegistry::contains(std::string_view name) const {
    return services_.contains(std::string(name));
}

std::shared_ptr<runtime::RuntimeService> OperatorServiceRegistry::find(std::string_view name) const {
    const auto it = services_.find(std::string(name));
    return it == services_.end() ? nullptr : it->second;
}

std::vector<std::shared_ptr<runtime::RuntimeService>> OperatorServiceRegistry::ordered() const {
    try {
        return graph_.ordered();
    } catch (const runtime::ServiceError& error) {
        throw OperatorError(ErrorCode::MissingDependency, error.what());
    }
}

std::size_t OperatorServiceRegistry::size() const noexcept {
    return services_.size();
}

} // namespace exotic::codex_operator
