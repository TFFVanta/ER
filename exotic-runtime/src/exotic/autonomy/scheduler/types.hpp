#pragma once

#include "../types.hpp"

#include <chrono>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace exotic::autonomy::scheduler {

using Clock = exotic::autonomy::Clock;

using JobId = std::uint64_t;
using EventId = std::uint64_t;
using LeaseId = std::uint64_t;
using DeadLetterId = std::uint64_t;

using SteadyClock = std::chrono::steady_clock;

// Higher numeric value means higher scheduling priority.
enum class JobPriority : std::int32_t {
    Background = 0,
    Low = 25,
    Normal = 50,
    High = 75,
    Critical = 100
};

enum class JobKind {
    Immediate,
    Scheduled,
    Recurring,
    Conditional
};

enum class JobStatus {
    Pending,
    Ready,
    Leased,
    Running,
    WaitingRetry,
    Blocked,
    Completed,
    Cancelled,
    DeadLettered
};

enum class TriggerKind {
    None,
    AtTime,
    FixedInterval,
    EventMatch,
    Condition
};

enum class DependencyPolicy {
    AllCompleted,
    AllSuccessful,
    AnyCompleted,
    AnySuccessful
};

enum class FailureClass {
    Transient,
    Permanent,
    Timeout,
    Cancelled,
    PolicyDenied,
    VerificationFailed
};

struct RetryPolicy {
    std::uint32_t max_attempts{5};
    std::chrono::milliseconds initial_delay{1000};
    std::chrono::milliseconds maximum_delay{300000};
    double multiplier{2.0};
    double jitter_fraction{0.10};
};

struct ConcurrencyPolicy {
    std::string group{"default"};
    std::uint32_t max_running{1};
};

struct Trigger {
    TriggerKind kind{TriggerKind::None};
    TimePoint run_at{};
    std::chrono::milliseconds interval{0};
    std::string event_type;
    std::string condition_key;
    std::string condition_expression;
};

struct JobDependency {
    JobId depends_on{0};
    DependencyPolicy policy{DependencyPolicy::AllSuccessful};
};

struct Job {
    JobId id{0};
    ObjectiveId objective_id{0};
    ProposalId proposal_id{0};

    std::string name;
    std::string payload_json{"{}"};
    std::string idempotency_key;

    JobKind kind{JobKind::Immediate};
    JobStatus status{JobStatus::Pending};
    JobPriority priority{JobPriority::Normal};

    Trigger trigger;
    RetryPolicy retry;
    ConcurrencyPolicy concurrency;
    std::vector<JobDependency> dependencies;

    std::uint32_t attempt{0};
    TimePoint created_at{Clock::now()};
    TimePoint updated_at{Clock::now()};
    TimePoint next_run_at{Clock::now()};
    std::optional<TimePoint> deadline;
    std::optional<TimePoint> completed_at;

    std::string last_error;
};

struct Event {
    EventId id{0};
    std::string type;
    std::string source;
    std::string subject;
    std::string payload_json{"{}"};
    std::string idempotency_key;
    TimePoint available_at{Clock::now()};
    TimePoint created_at{Clock::now()};
    std::optional<TimePoint> consumed_at;
};

struct Lease {
    LeaseId id{0};
    JobId job_id{0};
    std::string worker_id;
    TimePoint acquired_at{Clock::now()};
    TimePoint heartbeat_at{Clock::now()};
    TimePoint expires_at{Clock::now()};
    bool released{false};
};

struct DeadLetter {
    DeadLetterId id{0};
    JobId job_id{0};
    FailureClass failure_class{FailureClass::Permanent};
    std::string reason;
    std::string payload_json{"{}"};
    std::uint32_t attempts{0};
    TimePoint created_at{Clock::now()};
};

struct SchedulerLimits {
    std::uint32_t global_max_running{8};
    std::chrono::milliseconds lease_duration{30000};
    std::chrono::milliseconds heartbeat_interval{5000};
    std::chrono::milliseconds poll_interval{250};
    std::chrono::milliseconds execution_timeout{300000};
};

struct SchedulerStats {
    std::uint64_t pending{0};
    std::uint64_t ready{0};
    std::uint64_t leased{0};
    std::uint64_t running{0};
    std::uint64_t waiting_retry{0};
    std::uint64_t blocked{0};
    std::uint64_t completed{0};
    std::uint64_t dead_lettered{0};
    std::uint64_t active_leases{0};
};

std::string to_string(JobKind value);
std::string to_string(JobStatus value);
std::string to_string(TriggerKind value);
std::string to_string(DependencyPolicy value);
std::string to_string(FailureClass value);

std::optional<JobKind> job_kind_from_string(std::string_view value);
std::optional<JobStatus> job_status_from_string(std::string_view value);
std::optional<TriggerKind> trigger_kind_from_string(std::string_view value);
std::optional<DependencyPolicy> dependency_policy_from_string(std::string_view value);
std::optional<FailureClass> failure_class_from_string(std::string_view value);

} // namespace exotic::autonomy::scheduler
