#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <future>

namespace exotic::codex_operator {

namespace {

std::string make_message_id() {
    return std::to_string(std::chrono::duration_cast<std::chrono::microseconds>(
        Clock::now().time_since_epoch()).count());
}

} // namespace

WorkerExecutionEngine::WorkerExecutionEngine(StructuredLogger& logger,
                                             MetricsCollector& metrics,
                                             WorkerRegistry& registry,
                                             WorkerMessageBus& messages,
                                             WorkerStateStore& state_store)
    : logger_(logger),
      metrics_(metrics),
      registry_(registry),
      messages_(messages),
      state_store_(state_store) {}

void WorkerExecutionEngine::submit(WorkerAssignment assignment) {
    std::scoped_lock lock(mutex_);
    queue_.push_back(std::move(assignment));
    runtime_metrics_.queue_length = queue_.size();
}

std::optional<WorkerAssignment> WorkerExecutionEngine::take_next() {
    std::scoped_lock lock(mutex_);
    if (paused_ || queue_.empty()) {
        return std::nullopt;
    }
    auto assignment = std::move(queue_.front());
    queue_.pop_front();
    runtime_metrics_.queue_length = queue_.size();
    return assignment;
}

WorkerResult WorkerExecutionEngine::run_one(const WorkerDispatcher& dispatcher) {
    const auto next = take_next();
    if (!next) {
        return {"", "", false, "no assignment available", {}, std::chrono::milliseconds(0)};
    }
    return execute_assignment(*next, dispatcher);
}

std::vector<WorkerResult> WorkerExecutionEngine::run_all(const WorkerDispatcher& dispatcher, ExecutionMode mode) {
    std::vector<WorkerResult> results;
    if (mode == ExecutionMode::Parallel) {
        std::vector<std::future<WorkerResult>> futures;
        while (true) {
            const auto next = take_next();
            if (!next) {
                break;
            }
            futures.push_back(std::async(std::launch::async, [this, &dispatcher, assignment = *next]() mutable {
                return execute_assignment(std::move(assignment), dispatcher);
            }));
        }
        for (auto& future : futures) {
            results.push_back(future.get());
        }
        return results;
    }

    while (true) {
        const auto next = take_next();
        if (!next) {
            break;
        }
        results.push_back(execute_assignment(*next, dispatcher));
    }
    return results;
}

WorkerResult WorkerExecutionEngine::execute_assignment(WorkerAssignment assignment, const WorkerDispatcher& dispatcher) {
    const auto decision = dispatcher.dispatch(registry_, assignment);
    if (!decision.matched) {
        assignment.status = AssignmentStatus::DeadLettered;
        push_dead_letter(assignment);
        metrics_.increment_error_count();
        ++runtime_metrics_.failure_count;
        return {assignment.id, "", false, decision.rationale, {}, std::chrono::milliseconds(0)};
    }

    assignment.worker_id = decision.worker_id;
    assignment.status = AssignmentStatus::Assigned;
    assignment.started_at = Clock::now();
    messages_.emit({make_message_id(), WorkerMessageKind::ObjectiveAssigned, assignment.id, assignment.worker_id, assignment.objective.id, decision.rationale, Clock::now()});

    auto worker = registry_.find(assignment.worker_id);
    if (!worker) {
        assignment.status = AssignmentStatus::DeadLettered;
        push_dead_letter(assignment);
        metrics_.increment_error_count();
        ++runtime_metrics_.failure_count;
        return {assignment.id, assignment.worker_id, false, "selected worker not found", {}, std::chrono::milliseconds(0)};
    }

    WorkerState state;
    state.worker_id = assignment.worker_id;
    state.health = WorkerHealthStatus::Healthy;
    state.availability = WorkerAvailability::Busy;
    state.current_assignment = assignment.id;
    state.queue_depth = queue_snapshot().queued;
    state.last_heartbeat = Clock::now();
    state_store_.update(state);
    registry_.update_health(assignment.worker_id, WorkerHealthStatus::Healthy, WorkerAvailability::Busy);
    {
        std::scoped_lock lock(mutex_);
        ++running_count_;
    }

    messages_.emit({make_message_id(), WorkerMessageKind::ObjectiveStarted, assignment.id, assignment.worker_id, assignment.objective.id, "started", Clock::now()});
    const auto started = std::chrono::steady_clock::now();
    auto result = worker->execute(assignment);
    result.assignment_id = assignment.id;
    result.worker_id = assignment.worker_id;
    result.duration = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started);

    assignment.completed_at = Clock::now();
    assignment.status = result.success ? AssignmentStatus::Completed : AssignmentStatus::Failed;

    if (!result.success && assignment.attempt < 2) {
        ++assignment.attempt;
        assignment.status = AssignmentStatus::WaitingRetry;
        {
            std::scoped_lock lock(mutex_);
            queue_.push_back(assignment);
            runtime_metrics_.queue_length = queue_.size();
            ++runtime_metrics_.retry_count;
        }
        messages_.emit({make_message_id(), WorkerMessageKind::WorkerFailed, assignment.id, assignment.worker_id, assignment.objective.id, "retry scheduled", Clock::now()});
    } else if (!result.success) {
        push_dead_letter(assignment);
        messages_.emit({make_message_id(), WorkerMessageKind::WorkerFailed, assignment.id, assignment.worker_id, assignment.objective.id, "dead-lettered", Clock::now()});
        registry_.update_health(assignment.worker_id, WorkerHealthStatus::Quarantined, WorkerAvailability::Offline);
        ++runtime_metrics_.recovery_count;
    } else {
        messages_.emit({make_message_id(), WorkerMessageKind::ObjectiveCompleted, assignment.id, assignment.worker_id, assignment.objective.id, result.summary, Clock::now()});
    }

    {
        std::scoped_lock lock(mutex_);
        history_.push_back(assignment);
        if (result.success) {
            ++runtime_metrics_.success_count;
        } else {
            ++runtime_metrics_.failure_count;
        }
        const auto total = runtime_metrics_.success_count + runtime_metrics_.failure_count;
        if (total == 1) {
            runtime_metrics_.average_latency = result.duration;
        } else {
            const auto combined = runtime_metrics_.average_latency.count() * static_cast<long long>(total - 1) + result.duration.count();
            runtime_metrics_.average_latency = std::chrono::milliseconds(combined / static_cast<long long>(total));
        }
    }

    registry_.record_result(result);
    state.availability = WorkerAvailability::Available;
    state.current_assignment.reset();
    state.last_heartbeat = Clock::now();
    if (!result.success && assignment.attempt >= 2) {
        state.health = WorkerHealthStatus::Quarantined;
        state.availability = WorkerAvailability::Offline;
    }
    state_store_.update(state);
    if (result.success) {
        registry_.update_health(assignment.worker_id, WorkerHealthStatus::Healthy, WorkerAvailability::Available);
    }
    metrics_.set_active_workers(registry_.list().size());
    {
        std::scoped_lock lock(mutex_);
        if (running_count_ > 0) {
            --running_count_;
        }
    }
    return result;
}

void WorkerExecutionEngine::push_dead_letter(WorkerAssignment assignment) {
    assignment.status = AssignmentStatus::DeadLettered;
    std::scoped_lock lock(mutex_);
    dead_letters_.push_back(std::move(assignment));
}

void WorkerExecutionEngine::cancel(std::string_view assignment_id) {
    std::scoped_lock lock(mutex_);
    queue_.erase(std::remove_if(queue_.begin(), queue_.end(), [&](const WorkerAssignment& assignment) {
        return assignment.id == assignment_id;
    }), queue_.end());
    runtime_metrics_.queue_length = queue_.size();
}

void WorkerExecutionEngine::pause() {
    std::scoped_lock lock(mutex_);
    paused_ = true;
}

void WorkerExecutionEngine::resume() {
    std::scoped_lock lock(mutex_);
    paused_ = false;
}

void WorkerExecutionEngine::heartbeat(std::string_view worker_id) {
    auto state = state_store_.find(worker_id).value_or(WorkerState{std::string(worker_id)});
    state.last_heartbeat = Clock::now();
    state_store_.update(state);
}

RuntimeQueueSnapshot WorkerExecutionEngine::queue_snapshot() const {
    std::scoped_lock lock(mutex_);
    return {queue_.size(), running_count_, dead_letters_.size()};
}

std::vector<WorkerAssignment> WorkerExecutionEngine::history() const {
    std::scoped_lock lock(mutex_);
    return history_;
}

WorkerRuntimeMetrics WorkerExecutionEngine::metrics_snapshot() const {
    auto states = state_store_.list();
    std::scoped_lock lock(mutex_);
    auto snapshot = runtime_metrics_;
    const auto total_workers = registry_.list().size();
    const auto busy_workers = std::count_if(states.begin(), states.end(), [](const WorkerState& state) {
        return state.availability == WorkerAvailability::Busy;
    });
    snapshot.worker_utilization = total_workers == 0 ? 0.0 : static_cast<double>(busy_workers) / static_cast<double>(total_workers);
    return snapshot;
}

} // namespace exotic::codex_operator
