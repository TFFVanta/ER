#pragma once

#include "../types.hpp"
#include "../scheduler/types.hpp"

#include <chrono>
#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace exotic::autonomy::resources {

using ResourceAccountId = std::uint64_t;
using ReservationId = std::uint64_t;
using UsageReportId = std::uint64_t;
using RateLimitId = std::uint64_t;
using CircuitBreakerId = std::uint64_t;
using AnomalyId = std::uint64_t;
using LedgerEventId = std::uint64_t;
using GovernanceApprovalId = std::uint64_t;

enum class ResourceDimension : std::uint8_t {
    MoneyUsd,
    ApiCredits,
    CpuMilliseconds,
    GpuMilliseconds,
    MemoryBytes,
    StorageBytes,
    NetworkBytes,
    ConcurrencySlots
};

enum class ResourceSemantics : std::uint8_t {
    Consumable,
    PersistentCapacity,
    EphemeralCapacity
};

enum class AccountScope : std::uint8_t {
    Workspace,
    Project,
    Agent,
    Task
};

enum class AccountStatus : std::uint8_t {
    Active,
    Frozen,
    Closed
};

enum class ReservationStatus : std::uint8_t {
    Active,
    Reconciled,
    Released,
    Expired
};

enum class CircuitState : std::uint8_t {
    Closed,
    Open,
    HalfOpen
};

enum class AdmissionFailure : std::uint8_t {
    None,
    EmergencyStop,
    AccountUnavailable,
    BudgetExceeded,
    ApprovalRequired,
    ApprovalInvalid,
    RateLimited,
    CircuitOpen,
    InvalidRequest,
    DuplicateConflict
};

enum class AnomalySeverity : std::uint8_t {
    Info,
    Warning,
    Critical
};

class ResourceVector {
public:
    using Storage = std::map<ResourceDimension, double>;

    ResourceVector() = default;
    ResourceVector(std::initializer_list<std::pair<const ResourceDimension, double>> values);

    [[nodiscard]] double get(ResourceDimension dimension) const noexcept;
    void set(ResourceDimension dimension, double value);
    void add(ResourceDimension dimension, double delta);

    [[nodiscard]] bool empty() const noexcept;
    [[nodiscard]] bool non_negative() const noexcept;
    [[nodiscard]] bool finite() const noexcept;
    [[nodiscard]] bool less_than_or_equal(const ResourceVector& other, double epsilon = 1e-9) const noexcept;

    [[nodiscard]] ResourceVector scaled(double factor) const;
    [[nodiscard]] const Storage& values() const noexcept;

    ResourceVector& operator+=(const ResourceVector& other);
    ResourceVector& operator-=(const ResourceVector& other);

private:
    Storage values_;
};

ResourceVector operator+(ResourceVector left, const ResourceVector& right);
ResourceVector operator-(ResourceVector left, const ResourceVector& right);

struct ResourceLimit {
    ResourceDimension dimension{ResourceDimension::MoneyUsd};
    double hard_limit{0.0};
    double soft_limit{0.0};
    double spent{0.0};
    double reserved{0.0};
};

struct ResourceAccount {
    ResourceAccountId id{0};
    std::optional<ResourceAccountId> parent_id;
    AccountScope scope{AccountScope::Workspace};
    std::string scope_id;
    std::string name;
    AccountStatus status{AccountStatus::Active};
    std::optional<double> approval_threshold_usd;
    std::vector<ResourceLimit> limits;
    TimePoint created_at{Clock::now()};
    TimePoint updated_at{Clock::now()};
};

struct RateLimit {
    RateLimitId id{0};
    ResourceAccountId account_id{0};
    std::string key{"admission"};
    double capacity{1.0};
    double available_tokens{1.0};
    double refill_per_second{1.0};
    double cost_per_admission{1.0};
    TimePoint last_refill_at{Clock::now()};
    bool active{true};
};

struct Reservation {
    ReservationId id{0};
    scheduler::JobId job_id{0};
    ProposalId proposal_id{0};
    std::optional<OperationId> operation_id;
    ResourceAccountId leaf_account_id{0};
    std::vector<ResourceAccountId> account_chain;
    std::string workload_key;
    std::string idempotency_key;
    ResourceVector requested;
    ResourceVector reserved;
    ResourceVector actual;
    ReservationStatus status{ReservationStatus::Active};
    TimePoint created_at{Clock::now()};
    TimePoint expires_at{Clock::now() + std::chrono::minutes(10)};
    std::optional<TimePoint> reconciled_at;
    std::optional<TimePoint> released_at;
    std::string release_reason;
};

struct UsageReport {
    UsageReportId id{0};
    ReservationId reservation_id{0};
    scheduler::JobId job_id{0};
    ProposalId proposal_id{0};
    std::string workload_key;
    std::string source;
    ResourceVector actual;
    TimePoint created_at{Clock::now()};
};

struct CostForecast {
    std::string workload_key;
    ResourceVector predicted;
    ResourceVector p95;
    std::size_t samples{0};
    double confidence{0.0};
    std::string method{"historical_mean_p95"};
};

struct ResourceAnomaly {
    AnomalyId id{0};
    ResourceAccountId account_id{0};
    ReservationId reservation_id{0};
    ResourceDimension dimension{ResourceDimension::MoneyUsd};
    double expected{0.0};
    double observed{0.0};
    double ratio{0.0};
    AnomalySeverity severity{AnomalySeverity::Warning};
    std::string reason;
    TimePoint created_at{Clock::now()};
};

struct CircuitBreaker {
    CircuitBreakerId id{0};
    std::string scope_key;
    CircuitState state{CircuitState::Closed};
    std::uint32_t consecutive_failures{0};
    std::uint32_t consecutive_successes{0};
    std::uint32_t failure_threshold{5};
    std::uint32_t recovery_success_threshold{2};
    std::chrono::milliseconds cooldown{60000};
    std::optional<TimePoint> opened_at;
    std::string reason;
    TimePoint updated_at{Clock::now()};
};

struct LedgerEvent {
    LedgerEventId id{0};
    std::string event_type;
    std::string entity_type;
    std::uint64_t entity_id{0};
    std::string actor;
    std::string payload;
    TimePoint created_at{Clock::now()};
};

struct AdmissionRequest {
    scheduler::JobId job_id{0};
    ProposalId proposal_id{0};
    std::optional<OperationId> operation_id;
    ResourceAccountId leaf_account_id{0};
    std::string workload_key;
    std::string idempotency_key;
    ResourceVector estimate;
    std::optional<GovernanceApprovalId> governance_approval_id;
    std::chrono::milliseconds reservation_ttl{600000};
    bool simulation{false};
};

struct AdmissionDecision {
    bool allowed{false};
    bool simulated{false};
    AdmissionFailure failure{AdmissionFailure::None};
    std::string reason;
    std::optional<Reservation> reservation;
};

struct ResourceStatus {
    bool emergency_stop{false};
    std::uint64_t accounts{0};
    std::uint64_t active_reservations{0};
    std::uint64_t open_circuits{0};
    std::uint64_t anomalies{0};
};

[[nodiscard]] ResourceSemantics semantics(ResourceDimension dimension) noexcept;
[[nodiscard]] bool is_consumptive(ResourceDimension dimension) noexcept;

std::string to_string(ResourceDimension value);
std::string to_string(AccountScope value);
std::string to_string(AccountStatus value);
std::string to_string(ReservationStatus value);
std::string to_string(CircuitState value);
std::string to_string(AdmissionFailure value);
std::string to_string(AnomalySeverity value);

std::optional<ResourceDimension> resource_dimension_from_string(std::string_view value);
std::optional<AccountScope> account_scope_from_string(std::string_view value);
std::optional<AccountStatus> account_status_from_string(std::string_view value);
std::optional<ReservationStatus> reservation_status_from_string(std::string_view value);
std::optional<CircuitState> circuit_state_from_string(std::string_view value);
std::optional<AnomalySeverity> anomaly_severity_from_string(std::string_view value);

} // namespace exotic::autonomy::resources
