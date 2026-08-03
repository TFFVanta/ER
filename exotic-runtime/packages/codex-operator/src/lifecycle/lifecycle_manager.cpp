#include "exotic/codex_operator/operator.hpp"

#include <algorithm>

namespace exotic::codex_operator {

LifecycleManager::LifecycleManager(StructuredLogger& logger, MetricsCollector& metrics, HealthMonitor& health)
    : logger_(logger), metrics_(metrics), health_(health) {}

void LifecycleManager::recover(OperatorServiceRegistry& services) {
    validate_dependencies(services);
    for (const auto& service : services.ordered()) {
        logger_.info("lifecycle", "recovering service", {{"service", service->name()}});
        service->recover();
        health_.observe(service->health());
    }
}

void LifecycleManager::start(OperatorServiceRegistry& services) {
    std::size_t running = 0;
    for (const auto& service : services.ordered()) {
        logger_.info("lifecycle", "starting service", {{"service", service->name()}});
        service->start();
        health_.observe(service->health());
        ++running;
    }
    metrics_.set_active_services(running);
    metrics_.refresh_memory_usage();
}

void LifecycleManager::shutdown(OperatorServiceRegistry& services) noexcept {
    try {
        auto ordered = services.ordered();
        std::reverse(ordered.begin(), ordered.end());
        for (const auto& service : ordered) {
            logger_.info("lifecycle", "stopping service", {{"service", service->name()}});
            service->request_stop();
            service->join();
            health_.observe(service->health());
        }
    } catch (const std::exception& error) {
        logger_.error("lifecycle", "shutdown failure", {{"error", error.what()}});
        metrics_.increment_error_count();
    }
    metrics_.set_active_services(0);
    metrics_.refresh_memory_usage();
}

void LifecycleManager::validate_dependencies(OperatorServiceRegistry& services) {
    health_.clear_dependency_failures();
    try {
        (void)services.ordered();
    } catch (const OperatorError& error) {
        metrics_.increment_error_count();
        health_.record_dependency_failure(error.what());
        logger_.error("lifecycle", "dependency validation failed", {{"error", error.what()}});
        throw;
    }
}

EventBridge::EventBridge(EventBus& bus, StructuredLogger& logger, MetricsCollector& metrics)
    : bus_(bus), logger_(logger), metrics_(metrics) {}

EventBridge::~EventBridge() {
    stop();
}

void EventBridge::start() {
    if (subscription_token_) {
        return;
    }
    subscription_token_ = bus_.subscribe("*", [this](const Event& event) {
        metrics_.increment_event_throughput();
        logger_.debug("event-bus", "event observed", {{"type", event.type}});
    });
}

void EventBridge::stop() {
    if (!subscription_token_) {
        return;
    }
    bus_.unsubscribe(*subscription_token_);
    subscription_token_.reset();
}

bool EventBridge::running() const noexcept {
    return subscription_token_.has_value();
}

} // namespace exotic::codex_operator
