#pragma once

#include "anomaly.hpp"
#include "approval.hpp"
#include "circuit_breaker.hpp"
#include "forecast.hpp"
#include "repository.hpp"

#include <string_view>

namespace exotic::autonomy::resources {

struct GovernorConfig {
    std::size_t maximum_hierarchy_depth{64};
    double anomaly_warning_ratio{1.50};
    double anomaly_critical_ratio{2.50};
};

class ResourceGovernor {
public:
    ResourceGovernor(
        ResourceRepository& repository,
        BudgetApprovalVerifier& approvals,
        GovernorConfig config = {}
    );

    ResourceAccountId create_account(ResourceAccount account);
    void save_account(ResourceAccount account);
    RateLimitId create_rate_limit(RateLimit limit);

    [[nodiscard]] AdmissionDecision preview(const AdmissionRequest& request);
    [[nodiscard]] AdmissionDecision admit(const AdmissionRequest& request);

    bool heartbeat(ReservationId reservation_id, std::chrono::milliseconds ttl);
    bool release(ReservationId reservation_id, std::string_view reason);
    bool reconcile(
        ReservationId reservation_id,
        const ResourceVector& actual,
        std::string_view source,
        TimePoint at = Clock::now()
    );

    bool release_allocation(
        ResourceAccountId account_id,
        ResourceDimension dimension,
        double amount,
        TimePoint at = Clock::now()
    );

    [[nodiscard]] CostForecast forecast(std::string_view workload_key, std::size_t sample_limit = 100);

    void record_execution_success(std::string_view workload_key, TimePoint at = Clock::now());
    void record_execution_failure(std::string_view workload_key, std::string_view reason, TimePoint at = Clock::now());

    void emergency_stop(std::string_view actor, std::string_view reason);
    void clear_emergency_stop(std::string_view actor, std::string_view reason);

    [[nodiscard]] ResourceStatus status();
    [[nodiscard]] ResourceRepository& repository() noexcept;

private:
    ResourceRepository& repository_;
    BudgetApprovalVerifier& approvals_;
    CostForecaster forecaster_;
    AnomalyDetector anomalies_;
    CircuitBreakerService circuits_;
    GovernorConfig config_;

    [[nodiscard]] std::vector<ResourceAccount> resolve_hierarchy(ResourceAccountId leaf_account_id);
    [[nodiscard]] AdmissionDecision validate(
        const AdmissionRequest& request,
        const std::vector<ResourceAccount>& hierarchy,
        bool check_circuit
    );
    void ledger(std::string event_type, std::string entity_type, std::uint64_t entity_id, std::string actor, std::string payload);
};

} // namespace exotic::autonomy::resources
