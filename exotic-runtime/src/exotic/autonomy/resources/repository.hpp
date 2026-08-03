#pragma once

#include "types.hpp"

#include <optional>
#include <string_view>
#include <vector>

namespace exotic::autonomy::resources {

struct ReservationAttempt {
    bool created{false};
    bool duplicate{false};
    AdmissionFailure failure{AdmissionFailure::None};
    std::string reason;
    std::optional<Reservation> reservation;
};

class ResourceRepository {
public:
    virtual ~ResourceRepository() = default;

    virtual ResourceAccountId next_account_id() = 0;
    virtual ReservationId next_reservation_id() = 0;
    virtual UsageReportId next_usage_report_id() = 0;
    virtual RateLimitId next_rate_limit_id() = 0;
    virtual CircuitBreakerId next_circuit_breaker_id() = 0;
    virtual AnomalyId next_anomaly_id() = 0;
    virtual LedgerEventId next_ledger_event_id() = 0;

    virtual void save_account(const ResourceAccount& account) = 0;
    virtual std::optional<ResourceAccount> load_account(ResourceAccountId id) = 0;
    virtual std::optional<ResourceAccount> find_account(AccountScope scope, std::string_view scope_id) = 0;
    virtual std::vector<ResourceAccount> load_accounts() = 0;

    virtual void save_rate_limit(const RateLimit& limit) = 0;
    virtual std::vector<RateLimit> load_rate_limits(ResourceAccountId account_id) = 0;

    // Must atomically check all hierarchy balances and token buckets, create
    // the reservation, and increment reserved balances in one transaction.
    virtual ReservationAttempt try_create_reservation(const Reservation& reservation) = 0;
    virtual std::optional<Reservation> find_reservation(ReservationId id) = 0;
    virtual std::optional<Reservation> find_reservation_by_idempotency_key(std::string_view key) = 0;
    virtual std::vector<Reservation> load_active_reservations() = 0;
    virtual std::vector<Reservation> load_expired_reservations(TimePoint now) = 0;
    virtual bool heartbeat_reservation(ReservationId id, TimePoint expires_at) = 0;
    virtual bool release_reservation(ReservationId id, ReservationStatus status, TimePoint released_at, std::string_view reason) = 0;
    virtual bool reconcile_reservation(ReservationId id, const ResourceVector& actual, TimePoint reconciled_at) = 0;
    virtual bool adjust_spent(ResourceAccountId account_id, ResourceDimension dimension, double delta, TimePoint at) = 0;

    virtual void append_usage_report(const UsageReport& report) = 0;
    virtual std::vector<UsageReport> load_usage_reports(std::string_view workload_key, std::size_t limit) = 0;

    virtual void save_circuit_breaker(const CircuitBreaker& breaker) = 0;
    virtual std::optional<CircuitBreaker> load_circuit_breaker(std::string_view scope_key) = 0;
    virtual std::vector<CircuitBreaker> load_circuit_breakers() = 0;

    virtual void append_anomaly(const ResourceAnomaly& anomaly) = 0;
    virtual std::vector<ResourceAnomaly> load_anomalies(std::size_t limit) = 0;

    virtual void append_ledger_event(const LedgerEvent& event) = 0;

    virtual void set_emergency_stop(bool active, std::string_view actor, std::string_view reason) = 0;
    virtual bool emergency_stop_active() = 0;
    virtual ResourceStatus status() = 0;
};

} // namespace exotic::autonomy::resources
