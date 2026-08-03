#include "in_memory_repository.hpp"

#include <algorithm>
#include <cmath>

namespace exotic::autonomy::resources {

ResourceLimit* InMemoryResourceRepository::find_limit(
    ResourceAccount& account,
    ResourceDimension dimension
) {
    const auto iterator = std::find_if(
        account.limits.begin(),
        account.limits.end(),
        [dimension](const ResourceLimit& limit) {
            return limit.dimension == dimension;
        }
    );
    return iterator == account.limits.end() ? nullptr : &*iterator;
}

const ResourceLimit* InMemoryResourceRepository::find_limit(
    const ResourceAccount& account,
    ResourceDimension dimension
) {
    const auto iterator = std::find_if(
        account.limits.begin(),
        account.limits.end(),
        [dimension](const ResourceLimit& limit) {
            return limit.dimension == dimension;
        }
    );
    return iterator == account.limits.end() ? nullptr : &*iterator;
}

#define EXOTIC_NEXT_ID(method, field) \
    decltype(InMemoryResourceRepository::field) InMemoryResourceRepository::method() { \
        std::scoped_lock lock{mutex_}; \
        return field++; \
    }

ResourceAccountId InMemoryResourceRepository::next_account_id() {
    std::scoped_lock lock{mutex_};
    return account_id_++;
}
ReservationId InMemoryResourceRepository::next_reservation_id() {
    std::scoped_lock lock{mutex_};
    return reservation_id_++;
}
UsageReportId InMemoryResourceRepository::next_usage_report_id() {
    std::scoped_lock lock{mutex_};
    return usage_id_++;
}
RateLimitId InMemoryResourceRepository::next_rate_limit_id() {
    std::scoped_lock lock{mutex_};
    return rate_id_++;
}
CircuitBreakerId InMemoryResourceRepository::next_circuit_breaker_id() {
    std::scoped_lock lock{mutex_};
    return circuit_id_++;
}
AnomalyId InMemoryResourceRepository::next_anomaly_id() {
    std::scoped_lock lock{mutex_};
    return anomaly_id_++;
}
LedgerEventId InMemoryResourceRepository::next_ledger_event_id() {
    std::scoped_lock lock{mutex_};
    return ledger_id_++;
}

void InMemoryResourceRepository::save_account(const ResourceAccount& account) {
    std::scoped_lock lock{mutex_};
    accounts_[account.id] = account;
}

std::optional<ResourceAccount> InMemoryResourceRepository::load_account(ResourceAccountId id) {
    std::scoped_lock lock{mutex_};
    const auto iterator = accounts_.find(id);
    return iterator == accounts_.end() ? std::nullopt : std::optional<ResourceAccount>{iterator->second};
}

std::optional<ResourceAccount> InMemoryResourceRepository::find_account(
    AccountScope scope,
    std::string_view scope_id
) {
    std::scoped_lock lock{mutex_};
    for (const auto& [id, account] : accounts_) {
        (void)id;
        if (account.scope == scope && account.scope_id == scope_id) {
            return account;
        }
    }
    return std::nullopt;
}

std::vector<ResourceAccount> InMemoryResourceRepository::load_accounts() {
    std::scoped_lock lock{mutex_};
    std::vector<ResourceAccount> result;
    result.reserve(accounts_.size());
    for (const auto& [id, account] : accounts_) {
        (void)id;
        result.push_back(account);
    }
    return result;
}

void InMemoryResourceRepository::save_rate_limit(const RateLimit& limit) {
    std::scoped_lock lock{mutex_};
    rate_limits_[limit.id] = limit;
}

std::vector<RateLimit> InMemoryResourceRepository::load_rate_limits(ResourceAccountId account_id) {
    std::scoped_lock lock{mutex_};
    std::vector<RateLimit> result;
    for (const auto& [id, limit] : rate_limits_) {
        (void)id;
        if (limit.account_id == account_id) {
            result.push_back(limit);
        }
    }
    return result;
}

ReservationAttempt InMemoryResourceRepository::try_create_reservation(
    const Reservation& reservation
) {
    std::scoped_lock lock{mutex_};
    ReservationAttempt outcome;

    if (emergency_stop_) {
        outcome.failure = AdmissionFailure::EmergencyStop;
        outcome.reason = "resource emergency stop is active";
        return outcome;
    }

    for (const auto& [id, existing] : reservations_) {
        (void)id;
        if (!reservation.idempotency_key.empty() && existing.idempotency_key == reservation.idempotency_key) {
            outcome.duplicate = true;
            outcome.reservation = existing;
            if (
                existing.job_id == reservation.job_id &&
                existing.proposal_id == reservation.proposal_id &&
                existing.requested.values() == reservation.requested.values()
            ) {
                outcome.reason = "existing idempotent reservation returned";
                return outcome;
            }
            outcome.failure = AdmissionFailure::DuplicateConflict;
            outcome.reason = "idempotency key is already bound to a different request";
            return outcome;
        }
    }

    std::vector<std::pair<RateLimitId, RateLimit>> rate_updates;
    const auto now = reservation.created_at;

    for (const auto account_id : reservation.account_chain) {
        const auto account_iterator = accounts_.find(account_id);
        if (account_iterator == accounts_.end() || account_iterator->second.status != AccountStatus::Active) {
            outcome.failure = AdmissionFailure::AccountUnavailable;
            outcome.reason = "one or more resource accounts are unavailable";
            return outcome;
        }

        const auto& account = account_iterator->second;
        for (const auto& [dimension, amount] : reservation.requested.values()) {
            const auto* limit = find_limit(account, dimension);
            if (!limit) {
                continue;
            }
            if (limit->spent + limit->reserved + amount > limit->hard_limit + 1e-9) {
                outcome.failure = AdmissionFailure::BudgetExceeded;
                outcome.reason = "hierarchical hard limit exceeded for " + to_string(dimension);
                return outcome;
            }
        }

        for (const auto& [id, stored] : rate_limits_) {
            if (!stored.active || stored.account_id != account_id) {
                continue;
            }
            auto updated = stored;
            const auto elapsed = std::chrono::duration<double>(now - updated.last_refill_at).count();
            if (elapsed > 0.0) {
                updated.available_tokens = std::min(
                    updated.capacity,
                    updated.available_tokens + elapsed * updated.refill_per_second
                );
                updated.last_refill_at = now;
            }
            if (updated.available_tokens + 1e-9 < updated.cost_per_admission) {
                outcome.failure = AdmissionFailure::RateLimited;
                outcome.reason = "rate limit denied admission: " + updated.key;
                return outcome;
            }
            updated.available_tokens -= updated.cost_per_admission;
            rate_updates.emplace_back(id, updated);
        }
    }

    for (const auto& [id, updated] : rate_updates) {
        rate_limits_[id] = updated;
    }
    for (const auto account_id : reservation.account_chain) {
        auto& account = accounts_.at(account_id);
        for (const auto& [dimension, amount] : reservation.reserved.values()) {
            if (auto* limit = find_limit(account, dimension)) {
                limit->reserved += amount;
            }
        }
        account.updated_at = now;
    }

    reservations_[reservation.id] = reservation;
    outcome.created = true;
    outcome.reason = "resource reservation created";
    outcome.reservation = reservation;
    return outcome;
}

std::optional<Reservation> InMemoryResourceRepository::find_reservation(ReservationId id) {
    std::scoped_lock lock{mutex_};
    const auto iterator = reservations_.find(id);
    return iterator == reservations_.end() ? std::nullopt : std::optional<Reservation>{iterator->second};
}

std::optional<Reservation> InMemoryResourceRepository::find_reservation_by_idempotency_key(
    std::string_view key
) {
    std::scoped_lock lock{mutex_};
    for (const auto& [id, reservation] : reservations_) {
        (void)id;
        if (reservation.idempotency_key == key) {
            return reservation;
        }
    }
    return std::nullopt;
}

std::vector<Reservation> InMemoryResourceRepository::load_active_reservations() {
    std::scoped_lock lock{mutex_};
    std::vector<Reservation> result;
    for (const auto& [id, reservation] : reservations_) {
        (void)id;
        if (reservation.status == ReservationStatus::Active) {
            result.push_back(reservation);
        }
    }
    return result;
}

std::vector<Reservation> InMemoryResourceRepository::load_expired_reservations(TimePoint now) {
    std::scoped_lock lock{mutex_};
    std::vector<Reservation> result;
    for (const auto& [id, reservation] : reservations_) {
        (void)id;
        if (reservation.status == ReservationStatus::Active && reservation.expires_at <= now) {
            result.push_back(reservation);
        }
    }
    return result;
}

bool InMemoryResourceRepository::heartbeat_reservation(ReservationId id, TimePoint expires_at) {
    std::scoped_lock lock{mutex_};
    const auto iterator = reservations_.find(id);
    if (iterator == reservations_.end() || iterator->second.status != ReservationStatus::Active) {
        return false;
    }
    iterator->second.expires_at = expires_at;
    return true;
}

bool InMemoryResourceRepository::release_reservation(
    ReservationId id,
    ReservationStatus status,
    TimePoint released_at,
    std::string_view reason
) {
    std::scoped_lock lock{mutex_};
    const auto iterator = reservations_.find(id);
    if (iterator == reservations_.end() || iterator->second.status != ReservationStatus::Active) {
        return false;
    }
    auto& reservation = iterator->second;
    for (const auto account_id : reservation.account_chain) {
        auto account_iterator = accounts_.find(account_id);
        if (account_iterator == accounts_.end()) {
            continue;
        }
        for (const auto& [dimension, amount] : reservation.reserved.values()) {
            if (auto* limit = find_limit(account_iterator->second, dimension)) {
                limit->reserved = std::max(0.0, limit->reserved - amount);
            }
        }
        account_iterator->second.updated_at = released_at;
    }
    reservation.status = status;
    reservation.released_at = released_at;
    reservation.release_reason = std::string(reason);
    return true;
}

bool InMemoryResourceRepository::reconcile_reservation(
    ReservationId id,
    const ResourceVector& actual,
    TimePoint reconciled_at
) {
    std::scoped_lock lock{mutex_};
    const auto iterator = reservations_.find(id);
    if (iterator == reservations_.end() || iterator->second.status != ReservationStatus::Active) {
        return false;
    }
    auto& reservation = iterator->second;
    for (const auto account_id : reservation.account_chain) {
        auto account_iterator = accounts_.find(account_id);
        if (account_iterator == accounts_.end()) {
            continue;
        }
        for (const auto& [dimension, amount] : reservation.reserved.values()) {
            if (auto* limit = find_limit(account_iterator->second, dimension)) {
                limit->reserved = std::max(0.0, limit->reserved - amount);
            }
        }
        for (const auto& [dimension, amount] : actual.values()) {
            if (!is_consumptive(dimension)) {
                continue;
            }
            if (auto* limit = find_limit(account_iterator->second, dimension)) {
                limit->spent += amount;
            }
        }
        account_iterator->second.updated_at = reconciled_at;
    }
    reservation.actual = actual;
    reservation.status = ReservationStatus::Reconciled;
    reservation.reconciled_at = reconciled_at;
    return true;
}

bool InMemoryResourceRepository::adjust_spent(
    ResourceAccountId account_id,
    ResourceDimension dimension,
    double delta,
    TimePoint at
) {
    std::scoped_lock lock{mutex_};
    const auto iterator = accounts_.find(account_id);
    if (iterator == accounts_.end()) {
        return false;
    }
    auto* limit = find_limit(iterator->second, dimension);
    if (!limit || limit->spent + delta < -1e-9) {
        return false;
    }
    limit->spent = std::max(0.0, limit->spent + delta);
    iterator->second.updated_at = at;
    return true;
}

void InMemoryResourceRepository::append_usage_report(const UsageReport& report) {
    std::scoped_lock lock{mutex_};
    usage_reports_[report.id] = report;
}

std::vector<UsageReport> InMemoryResourceRepository::load_usage_reports(
    std::string_view workload_key,
    std::size_t limit
) {
    std::scoped_lock lock{mutex_};
    std::vector<UsageReport> result;
    for (auto iterator = usage_reports_.rbegin(); iterator != usage_reports_.rend(); ++iterator) {
        if (iterator->second.workload_key == workload_key) {
            result.push_back(iterator->second);
            if (result.size() >= limit) {
                break;
            }
        }
    }
    return result;
}

void InMemoryResourceRepository::save_circuit_breaker(const CircuitBreaker& breaker) {
    std::scoped_lock lock{mutex_};
    circuits_[breaker.id] = breaker;
}

std::optional<CircuitBreaker> InMemoryResourceRepository::load_circuit_breaker(
    std::string_view scope_key
) {
    std::scoped_lock lock{mutex_};
    for (const auto& [id, breaker] : circuits_) {
        (void)id;
        if (breaker.scope_key == scope_key) {
            return breaker;
        }
    }
    return std::nullopt;
}

std::vector<CircuitBreaker> InMemoryResourceRepository::load_circuit_breakers() {
    std::scoped_lock lock{mutex_};
    std::vector<CircuitBreaker> result;
    for (const auto& [id, breaker] : circuits_) {
        (void)id;
        result.push_back(breaker);
    }
    return result;
}

void InMemoryResourceRepository::append_anomaly(const ResourceAnomaly& anomaly) {
    std::scoped_lock lock{mutex_};
    anomalies_[anomaly.id] = anomaly;
}

std::vector<ResourceAnomaly> InMemoryResourceRepository::load_anomalies(std::size_t limit) {
    std::scoped_lock lock{mutex_};
    std::vector<ResourceAnomaly> result;
    for (auto iterator = anomalies_.rbegin(); iterator != anomalies_.rend(); ++iterator) {
        result.push_back(iterator->second);
        if (result.size() >= limit) {
            break;
        }
    }
    return result;
}

void InMemoryResourceRepository::append_ledger_event(const LedgerEvent& event) {
    std::scoped_lock lock{mutex_};
    ledger_[event.id] = event;
}

void InMemoryResourceRepository::set_emergency_stop(
    bool active,
    std::string_view actor,
    std::string_view reason
) {
    std::scoped_lock lock{mutex_};
    emergency_stop_ = active;
    emergency_actor_ = std::string(actor);
    emergency_reason_ = std::string(reason);
}

bool InMemoryResourceRepository::emergency_stop_active() {
    std::scoped_lock lock{mutex_};
    return emergency_stop_;
}

ResourceStatus InMemoryResourceRepository::status() {
    std::scoped_lock lock{mutex_};
    ResourceStatus result;
    result.emergency_stop = emergency_stop_;
    result.accounts = accounts_.size();
    result.anomalies = anomalies_.size();
    for (const auto& [id, reservation] : reservations_) {
        (void)id;
        if (reservation.status == ReservationStatus::Active) {
            ++result.active_reservations;
        }
    }
    for (const auto& [id, breaker] : circuits_) {
        (void)id;
        if (breaker.state == CircuitState::Open) {
            ++result.open_circuits;
        }
    }
    return result;
}

} // namespace exotic::autonomy::resources
