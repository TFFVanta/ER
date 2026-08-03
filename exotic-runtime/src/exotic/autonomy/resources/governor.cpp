#include "governor.hpp"

#include <algorithm>
#include <cmath>
#include <set>
#include <stdexcept>

namespace exotic::autonomy::resources {

ResourceGovernor::ResourceGovernor(
    ResourceRepository& repository,
    BudgetApprovalVerifier& approvals,
    GovernorConfig config
) : repository_(repository),
    approvals_(approvals),
    forecaster_(repository),
    anomalies_({config.anomaly_warning_ratio, config.anomaly_critical_ratio, 1e-9}),
    circuits_(repository),
    config_(config) {}

ResourceAccountId ResourceGovernor::create_account(ResourceAccount account) {
    if (account.id == 0) {
        account.id = repository_.next_account_id();
    }
    account.created_at = Clock::now();
    account.updated_at = account.created_at;
    save_account(account);
    ledger("account.created", "resource_account", account.id, "exotic.resource_governor", account.scope_id);
    return account.id;
}

void ResourceGovernor::save_account(ResourceAccount account) {
    if (account.id == 0 || account.scope_id.empty()) {
        throw std::invalid_argument("resource account requires an id and scope id");
    }
    for (const auto& limit : account.limits) {
        if (
            !std::isfinite(limit.hard_limit) ||
            !std::isfinite(limit.soft_limit) ||
            !std::isfinite(limit.spent) ||
            !std::isfinite(limit.reserved) ||
            limit.hard_limit < 0.0 ||
            limit.soft_limit < 0.0 ||
            limit.spent < 0.0 ||
            limit.reserved < 0.0 ||
            limit.soft_limit > limit.hard_limit + 1e-9
        ) {
            throw std::invalid_argument("resource account contains an invalid limit");
        }
    }
    account.updated_at = Clock::now();
    repository_.save_account(account);
}

RateLimitId ResourceGovernor::create_rate_limit(RateLimit limit) {
    if (limit.id == 0) {
        limit.id = repository_.next_rate_limit_id();
    }
    if (
        limit.account_id == 0 ||
        limit.capacity <= 0.0 ||
        limit.refill_per_second < 0.0 ||
        limit.cost_per_admission <= 0.0
    ) {
        throw std::invalid_argument("invalid resource rate limit");
    }
    limit.available_tokens = std::clamp(limit.available_tokens, 0.0, limit.capacity);
    repository_.save_rate_limit(limit);
    return limit.id;
}

std::vector<ResourceAccount> ResourceGovernor::resolve_hierarchy(
    ResourceAccountId leaf_account_id
) {
    std::vector<ResourceAccount> reversed;
    std::set<ResourceAccountId> visited;
    auto current = std::optional<ResourceAccountId>{leaf_account_id};

    while (current) {
        if (!visited.insert(*current).second) {
            throw std::runtime_error("resource account hierarchy contains a cycle");
        }
        if (reversed.size() >= config_.maximum_hierarchy_depth) {
            throw std::runtime_error("resource account hierarchy exceeds maximum depth");
        }
        auto account = repository_.load_account(*current);
        if (!account) {
            throw std::runtime_error("resource account hierarchy is incomplete");
        }
        reversed.push_back(*account);
        current = account->parent_id;
    }

    std::reverse(reversed.begin(), reversed.end());
    return reversed;
}

AdmissionDecision ResourceGovernor::validate(
    const AdmissionRequest& request,
    const std::vector<ResourceAccount>& hierarchy,
    bool check_circuit
) {
    AdmissionDecision result;
    result.simulated = request.simulation;

    if (
        request.job_id == 0 ||
        request.proposal_id == 0 ||
        request.leaf_account_id == 0 ||
        request.workload_key.empty() ||
        request.idempotency_key.empty() ||
        request.reservation_ttl <= std::chrono::milliseconds::zero() ||
        request.estimate.empty() ||
        !request.estimate.finite() ||
        !request.estimate.non_negative()
    ) {
        result.failure = AdmissionFailure::InvalidRequest;
        result.reason = "resource admission request is incomplete or invalid";
        return result;
    }

    if (repository_.emergency_stop_active()) {
        result.failure = AdmissionFailure::EmergencyStop;
        result.reason = "resource emergency stop is active";
        return result;
    }

    for (const auto& account : hierarchy) {
        if (account.status != AccountStatus::Active) {
            result.failure = AdmissionFailure::AccountUnavailable;
            result.reason = "resource account is not active: " + account.name;
            return result;
        }
        for (const auto& [dimension, amount] : request.estimate.values()) {
            const auto iterator = std::find_if(
                account.limits.begin(),
                account.limits.end(),
                [dimension](const ResourceLimit& limit) {
                    return limit.dimension == dimension;
                }
            );
            if (
                iterator != account.limits.end() &&
                iterator->spent + iterator->reserved + amount > iterator->hard_limit + 1e-9
            ) {
                result.failure = AdmissionFailure::BudgetExceeded;
                result.reason = "hard limit exceeded at " + account.name + " for " + to_string(dimension);
                return result;
            }
        }
    }

    const auto requested_usd = request.estimate.get(ResourceDimension::MoneyUsd);
    bool approval_required = false;
    for (const auto& account : hierarchy) {
        if (
            account.approval_threshold_usd &&
            requested_usd > *account.approval_threshold_usd + 1e-9
        ) {
            approval_required = true;
            break;
        }
    }

    if (approval_required) {
        if (!request.governance_approval_id) {
            result.failure = AdmissionFailure::ApprovalRequired;
            result.reason = "hierarchical budget policy requires governance approval";
            return result;
        }
        std::string approval_reason;
        if (!approvals_.approves(
            *request.governance_approval_id,
            request.proposal_id,
            requested_usd,
            Clock::now(),
            approval_reason
        )) {
            result.failure = AdmissionFailure::ApprovalInvalid;
            result.reason = approval_reason;
            return result;
        }
    }

    if (check_circuit) {
        std::string circuit_reason;
        if (!circuits_.allow("workload:" + request.workload_key, Clock::now(), circuit_reason)) {
            result.failure = AdmissionFailure::CircuitOpen;
            result.reason = circuit_reason;
            return result;
        }
    }

    result.allowed = true;
    result.reason = request.simulation
        ? "resource admission simulation passed"
        : "resource admission validation passed";
    return result;
}

AdmissionDecision ResourceGovernor::preview(const AdmissionRequest& request) {
    try {
        const auto hierarchy = resolve_hierarchy(request.leaf_account_id);
        auto result = validate(request, hierarchy, false);
        if (!result.allowed) {
            return result;
        }
        if (const auto breaker = repository_.load_circuit_breaker(
                "workload:" + request.workload_key
            )) {
            if (
                breaker->state == CircuitState::Open &&
                (!breaker->opened_at || Clock::now() < *breaker->opened_at + breaker->cooldown)
            ) {
                return {
                    false,
                    true,
                    AdmissionFailure::CircuitOpen,
                    "resource circuit is open: " + breaker->reason,
                    std::nullopt
                };
            }
        }
        result.simulated = true;
        result.reason = "resource admission simulation passed";
        return result;
    } catch (const std::exception& error) {
        return {false, request.simulation, AdmissionFailure::AccountUnavailable, error.what(), std::nullopt};
    }
}

AdmissionDecision ResourceGovernor::admit(const AdmissionRequest& request) {
    std::vector<ResourceAccount> hierarchy;
    try {
        hierarchy = resolve_hierarchy(request.leaf_account_id);
    } catch (const std::exception& error) {
        return {false, request.simulation, AdmissionFailure::AccountUnavailable, error.what(), std::nullopt};
    }

    auto validation = validate(request, hierarchy, true);
    if (!validation.allowed || request.simulation) {
        return validation;
    }

    Reservation reservation;
    reservation.id = repository_.next_reservation_id();
    reservation.job_id = request.job_id;
    reservation.proposal_id = request.proposal_id;
    reservation.operation_id = request.operation_id;
    reservation.leaf_account_id = request.leaf_account_id;
    reservation.workload_key = request.workload_key;
    reservation.idempotency_key = request.idempotency_key;
    reservation.requested = request.estimate;
    reservation.reserved = request.estimate;
    reservation.created_at = Clock::now();
    reservation.expires_at = reservation.created_at + request.reservation_ttl;
    for (const auto& account : hierarchy) {
        reservation.account_chain.push_back(account.id);
    }

    auto attempt = repository_.try_create_reservation(reservation);
    if (attempt.created || (attempt.duplicate && attempt.failure == AdmissionFailure::None)) {
        AdmissionDecision result;
        result.allowed = true;
        result.reason = attempt.reason;
        result.reservation = attempt.reservation;
        if (result.reservation) {
            ledger(
                attempt.created ? "reservation.created" : "reservation.idempotent_replay",
                "resource_reservation",
                result.reservation->id,
                "exotic.resource_governor",
                result.reservation->workload_key
            );
        }
        return result;
    }

    return {false, false, attempt.failure, attempt.reason, attempt.reservation};
}

bool ResourceGovernor::heartbeat(
    ReservationId reservation_id,
    std::chrono::milliseconds ttl
) {
    if (ttl <= std::chrono::milliseconds::zero()) {
        return false;
    }
    return repository_.heartbeat_reservation(reservation_id, Clock::now() + ttl);
}

bool ResourceGovernor::release(
    ReservationId reservation_id,
    std::string_view reason
) {
    const auto released = repository_.release_reservation(
        reservation_id,
        ReservationStatus::Released,
        Clock::now(),
        reason
    );
    if (released) {
        ledger("reservation.released", "resource_reservation", reservation_id, "exotic.resource_governor", std::string(reason));
    }
    return released;
}

bool ResourceGovernor::reconcile(
    ReservationId reservation_id,
    const ResourceVector& actual,
    std::string_view source,
    TimePoint at
) {
    if (!actual.finite() || !actual.non_negative()) {
        return false;
    }
    const auto reservation = repository_.find_reservation(reservation_id);
    if (!reservation || reservation->status != ReservationStatus::Active) {
        return false;
    }

    if (!repository_.reconcile_reservation(reservation_id, actual, at)) {
        return false;
    }

    UsageReport report;
    report.id = repository_.next_usage_report_id();
    report.reservation_id = reservation_id;
    report.job_id = reservation->job_id;
    report.proposal_id = reservation->proposal_id;
    report.workload_key = reservation->workload_key;
    report.source = std::string(source);
    report.actual = actual;
    report.created_at = at;
    repository_.append_usage_report(report);

    for (auto anomaly : anomalies_.detect(
        reservation->leaf_account_id,
        reservation_id,
        reservation->reserved,
        actual,
        at
    )) {
        anomaly.id = repository_.next_anomaly_id();
        repository_.append_anomaly(anomaly);
        if (anomaly.severity == AnomalySeverity::Critical) {
            circuits_.record_failure(
                "workload:" + reservation->workload_key,
                "critical resource consumption anomaly",
                at
            );
        }
    }

    ledger("reservation.reconciled", "resource_reservation", reservation_id, std::string(source), reservation->workload_key);
    return true;
}

bool ResourceGovernor::release_allocation(
    ResourceAccountId account_id,
    ResourceDimension dimension,
    double amount,
    TimePoint at
) {
    if (
        amount <= 0.0 ||
        semantics(dimension) != ResourceSemantics::PersistentCapacity
    ) {
        return false;
    }
    const auto released = repository_.adjust_spent(account_id, dimension, -amount, at);
    if (released) {
        ledger("allocation.released", "resource_account", account_id, "exotic.resource_governor", to_string(dimension));
    }
    return released;
}

CostForecast ResourceGovernor::forecast(std::string_view workload_key, std::size_t sample_limit) {
    return forecaster_.forecast(workload_key, sample_limit);
}

void ResourceGovernor::record_execution_success(std::string_view workload_key, TimePoint at) {
    circuits_.record_success("workload:" + std::string(workload_key), at);
}

void ResourceGovernor::record_execution_failure(
    std::string_view workload_key,
    std::string_view reason,
    TimePoint at
) {
    circuits_.record_failure("workload:" + std::string(workload_key), reason, at);
}

void ResourceGovernor::emergency_stop(std::string_view actor, std::string_view reason) {
    repository_.set_emergency_stop(true, actor, reason);
    ledger("resources.emergency_stop", "resource_control", 1, std::string(actor), std::string(reason));
}

void ResourceGovernor::clear_emergency_stop(std::string_view actor, std::string_view reason) {
    repository_.set_emergency_stop(false, actor, reason);
    ledger("resources.emergency_stop_cleared", "resource_control", 1, std::string(actor), std::string(reason));
}

ResourceStatus ResourceGovernor::status() {
    return repository_.status();
}

ResourceRepository& ResourceGovernor::repository() noexcept {
    return repository_;
}

void ResourceGovernor::ledger(
    std::string event_type,
    std::string entity_type,
    std::uint64_t entity_id,
    std::string actor,
    std::string payload
) {
    LedgerEvent event;
    event.id = repository_.next_ledger_event_id();
    event.event_type = std::move(event_type);
    event.entity_type = std::move(entity_type);
    event.entity_id = entity_id;
    event.actor = std::move(actor);
    event.payload = std::move(payload);
    repository_.append_ledger_event(event);
}

} // namespace exotic::autonomy::resources
