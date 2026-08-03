#include "exotic/codex_operator/operator.hpp"

#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string json_array(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (index != 0) {
            out << ",";
        }
        out << "\"" << values[index] << "\"";
    }
    out << "]";
    return out.str();
}

} // namespace

WorkerRuntimeApi::WorkerRuntimeApi(const WorkerRegistry& registry,
                                   const WorkerStateStore& state_store,
                                   const WorkerExecutionEngine& engine)
    : registry_(registry), state_store_(state_store), engine_(engine) {}

ApiResponse WorkerRuntimeApi::handle(const ApiRequest& request) const {
    if (request.path == "/workers") {
        std::vector<std::string> values;
        for (const auto& worker : registry_.list()) {
            values.push_back(worker.id + ":" + to_string(worker.kind));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/capabilities") {
        std::vector<std::string> values;
        for (const auto& worker : registry_.list()) {
            values.push_back(worker.id + ":" + std::to_string(worker.capabilities.supported_objective_types.size()));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/assignments" || request.path == "/execution-history") {
        std::vector<std::string> values;
        for (const auto& assignment : engine_.history()) {
            values.push_back(assignment.id + ":" + to_string(assignment.status));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/queues" || request.path == "/current-activity") {
        const auto queue = engine_.queue_snapshot();
        std::ostringstream out;
        out << "{"
            << "\"queued\":" << queue.queued << ","
            << "\"running\":" << queue.running << ","
            << "\"dead_lettered\":" << queue.dead_lettered
            << "}";
        return {200, "application/json", out.str()};
    }
    if (request.path == "/worker-health") {
        std::vector<std::string> values;
        for (const auto& state : state_store_.list()) {
            values.push_back(state.worker_id + ":" + to_string(state.health));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/metrics") {
        const auto metrics = engine_.metrics_snapshot();
        std::ostringstream out;
        out << "{"
            << "\"success_count\":" << metrics.success_count << ","
            << "\"failure_count\":" << metrics.failure_count << ","
            << "\"queue_length\":" << metrics.queue_length << ","
            << "\"retry_count\":" << metrics.retry_count << ","
            << "\"recovery_count\":" << metrics.recovery_count
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

} // namespace exotic::codex_operator
