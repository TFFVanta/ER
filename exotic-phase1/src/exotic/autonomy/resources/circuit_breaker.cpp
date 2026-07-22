#include "circuit_breaker.hpp"

namespace exotic::autonomy::resources {

CircuitBreakerService::CircuitBreakerService(ResourceRepository& repository)
    : repository_(repository) {}

CircuitBreaker CircuitBreakerService::get_or_create(std::string_view scope_key) {
    if (auto existing = repository_.load_circuit_breaker(scope_key)) {
        return *existing;
    }
    CircuitBreaker breaker;
    breaker.id = repository_.next_circuit_breaker_id();
    breaker.scope_key = std::string(scope_key);
    repository_.save_circuit_breaker(breaker);
    return breaker;
}

bool CircuitBreakerService::allow(
    std::string_view scope_key,
    TimePoint now,
    std::string& reason
) {
    auto breaker = get_or_create(scope_key);
    if (breaker.state == CircuitState::Closed) {
        reason = "circuit closed";
        return true;
    }
    if (breaker.state == CircuitState::Open) {
        if (!breaker.opened_at || now < *breaker.opened_at + breaker.cooldown) {
            reason = "resource circuit is open: " + breaker.reason;
            return false;
        }
        breaker.state = CircuitState::HalfOpen;
        breaker.consecutive_successes = 0;
        breaker.updated_at = now;
        repository_.save_circuit_breaker(breaker);
        reason = "circuit half-open probe allowed";
        return true;
    }
    reason = "circuit half-open probe allowed";
    return true;
}

void CircuitBreakerService::record_success(std::string_view scope_key, TimePoint now) {
    auto breaker = get_or_create(scope_key);
    breaker.consecutive_failures = 0;
    ++breaker.consecutive_successes;
    if (
        breaker.state == CircuitState::HalfOpen &&
        breaker.consecutive_successes >= breaker.recovery_success_threshold
    ) {
        breaker.state = CircuitState::Closed;
        breaker.opened_at.reset();
        breaker.reason.clear();
        breaker.consecutive_successes = 0;
    }
    breaker.updated_at = now;
    repository_.save_circuit_breaker(breaker);
}

void CircuitBreakerService::record_failure(
    std::string_view scope_key,
    std::string_view reason,
    TimePoint now
) {
    auto breaker = get_or_create(scope_key);
    breaker.consecutive_successes = 0;
    ++breaker.consecutive_failures;
    breaker.reason = std::string(reason);
    if (
        breaker.state == CircuitState::HalfOpen ||
        breaker.consecutive_failures >= breaker.failure_threshold
    ) {
        breaker.state = CircuitState::Open;
        breaker.opened_at = now;
    }
    breaker.updated_at = now;
    repository_.save_circuit_breaker(breaker);
}

} // namespace exotic::autonomy::resources
