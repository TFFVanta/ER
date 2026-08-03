#pragma once
#include "condition.hpp"
#include "execution_bridge.hpp"
#include "repository.hpp"
#include "retry.hpp"
#include <atomic>
#include <functional>
#include <mutex>
#include <stop_token>
#include <thread>
#include <unordered_map>

namespace exotic::autonomy::scheduler {

class DurableScheduler {
public:
    DurableScheduler(SchedulerRepository& repository, ExecutionBridge& execution, const ConditionEvaluator& conditions, SchedulerLimits limits = {});
    ~DurableScheduler();
    DurableScheduler(const DurableScheduler&) = delete;
    DurableScheduler& operator=(const DurableScheduler&) = delete;

    JobId submit(Job job);
    EventId publish(Event event);
    bool cancel(JobId id);
    void set_condition_context(ConditionContext context);

    void start(std::size_t worker_count, std::string worker_prefix = "exotic-worker");
    void request_stop();
    void join();

    void recover();
    SchedulerStats stats();
    void tick_once(std::string_view worker_id);

private:
    SchedulerRepository& repository_;
    ExecutionBridge& execution_;
    const ConditionEvaluator& conditions_;
    SchedulerLimits limits_;
    RetryCalculator retry_;
    std::mutex context_mutex_;
    ConditionContext condition_context_;
    std::vector<std::jthread> workers_;
    std::atomic<bool> started_{false};

    bool dependencies_satisfied(const Job& job);
    bool trigger_satisfied(Job& job, TimePoint now);
    bool concurrency_available(const Job& job);
    void process_events(TimePoint now);
    bool try_run(Job job, std::string_view worker_id, std::stop_token stop);
    void complete(Job& job, TimePoint now);
    void fail(Job& job, FailureClass failure_class, std::string reason, TimePoint now);
    void dead_letter(Job& job, FailureClass failure_class, std::string reason, TimePoint now);
    void worker_loop(std::stop_token stop, std::string worker_id);
};

} // namespace exotic::autonomy::scheduler
