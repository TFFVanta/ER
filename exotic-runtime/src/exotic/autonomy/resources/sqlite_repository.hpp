#pragma once

#include "repository.hpp"
#include "../persistence/database.hpp"

#include <filesystem>

namespace exotic::autonomy::resources {

class SqliteResourceRepository final : public ResourceRepository {
public:
    explicit SqliteResourceRepository(const std::filesystem::path& database_path);

    ResourceAccountId next_account_id() override;
    ReservationId next_reservation_id() override;
    UsageReportId next_usage_report_id() override;
    RateLimitId next_rate_limit_id() override;
    CircuitBreakerId next_circuit_breaker_id() override;
    AnomalyId next_anomaly_id() override;
    LedgerEventId next_ledger_event_id() override;

    void save_account(const ResourceAccount& account) override;
    std::optional<ResourceAccount> load_account(ResourceAccountId id) override;
    std::optional<ResourceAccount> find_account(AccountScope scope, std::string_view scope_id) override;
    std::vector<ResourceAccount> load_accounts() override;

    void save_rate_limit(const RateLimit& limit) override;
    std::vector<RateLimit> load_rate_limits(ResourceAccountId account_id) override;

    ReservationAttempt try_create_reservation(const Reservation& reservation) override;
    std::optional<Reservation> find_reservation(ReservationId id) override;
    std::optional<Reservation> find_reservation_by_idempotency_key(std::string_view key) override;
    std::vector<Reservation> load_active_reservations() override;
    std::vector<Reservation> load_expired_reservations(TimePoint now) override;
    bool heartbeat_reservation(ReservationId id, TimePoint expires_at) override;
    bool release_reservation(ReservationId id, ReservationStatus status, TimePoint released_at, std::string_view reason) override;
    bool reconcile_reservation(ReservationId id, const ResourceVector& actual, TimePoint reconciled_at) override;
    bool adjust_spent(ResourceAccountId account_id, ResourceDimension dimension, double delta, TimePoint at) override;

    void append_usage_report(const UsageReport& report) override;
    std::vector<UsageReport> load_usage_reports(std::string_view workload_key, std::size_t limit) override;

    void save_circuit_breaker(const CircuitBreaker& breaker) override;
    std::optional<CircuitBreaker> load_circuit_breaker(std::string_view scope_key) override;
    std::vector<CircuitBreaker> load_circuit_breakers() override;

    void append_anomaly(const ResourceAnomaly& anomaly) override;
    std::vector<ResourceAnomaly> load_anomalies(std::size_t limit) override;
    void append_ledger_event(const LedgerEvent& event) override;

    void set_emergency_stop(bool active, std::string_view actor, std::string_view reason) override;
    bool emergency_stop_active() override;
    ResourceStatus status() override;

private:
    persistence::Database database_;

    void migrate();
    std::uint64_t next_id(std::string_view table);
    std::optional<Reservation> load_reservation_by_id(ReservationId id);
};

} // namespace exotic::autonomy::resources
