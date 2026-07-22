#include "types.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace exotic::autonomy::resources {

ResourceVector::ResourceVector(
    std::initializer_list<std::pair<const ResourceDimension, double>> values
) : values_(values) {
    if (!finite()) {
        throw std::invalid_argument("resource vector contains a non-finite value");
    }
}

double ResourceVector::get(ResourceDimension dimension) const noexcept {
    const auto iterator = values_.find(dimension);
    return iterator == values_.end() ? 0.0 : iterator->second;
}

void ResourceVector::set(ResourceDimension dimension, double value) {
    if (!std::isfinite(value)) {
        throw std::invalid_argument("resource value must be finite");
    }
    if (std::abs(value) < 1e-12) {
        values_.erase(dimension);
    } else {
        values_[dimension] = value;
    }
}

void ResourceVector::add(ResourceDimension dimension, double delta) {
    set(dimension, get(dimension) + delta);
}

bool ResourceVector::empty() const noexcept {
    return values_.empty();
}

bool ResourceVector::non_negative() const noexcept {
    return std::all_of(values_.begin(), values_.end(), [](const auto& value) {
        return value.second >= -1e-9;
    });
}

bool ResourceVector::finite() const noexcept {
    return std::all_of(values_.begin(), values_.end(), [](const auto& value) {
        return std::isfinite(value.second);
    });
}

bool ResourceVector::less_than_or_equal(
    const ResourceVector& other,
    double epsilon
) const noexcept {
    for (const auto& [dimension, value] : values_) {
        if (value > other.get(dimension) + epsilon) {
            return false;
        }
    }
    return true;
}

ResourceVector ResourceVector::scaled(double factor) const {
    if (!std::isfinite(factor)) {
        throw std::invalid_argument("resource scale factor must be finite");
    }
    ResourceVector result;
    for (const auto& [dimension, value] : values_) {
        result.set(dimension, value * factor);
    }
    return result;
}

const ResourceVector::Storage& ResourceVector::values() const noexcept {
    return values_;
}

ResourceVector& ResourceVector::operator+=(const ResourceVector& other) {
    for (const auto& [dimension, value] : other.values()) {
        add(dimension, value);
    }
    return *this;
}

ResourceVector& ResourceVector::operator-=(const ResourceVector& other) {
    for (const auto& [dimension, value] : other.values()) {
        add(dimension, -value);
    }
    return *this;
}

ResourceVector operator+(ResourceVector left, const ResourceVector& right) {
    left += right;
    return left;
}

ResourceVector operator-(ResourceVector left, const ResourceVector& right) {
    left -= right;
    return left;
}

ResourceSemantics semantics(ResourceDimension dimension) noexcept {
    switch (dimension) {
        case ResourceDimension::MemoryBytes:
        case ResourceDimension::ConcurrencySlots:
            return ResourceSemantics::EphemeralCapacity;
        case ResourceDimension::StorageBytes:
            return ResourceSemantics::PersistentCapacity;
        case ResourceDimension::MoneyUsd:
        case ResourceDimension::ApiCredits:
        case ResourceDimension::CpuMilliseconds:
        case ResourceDimension::GpuMilliseconds:
        case ResourceDimension::NetworkBytes:
            return ResourceSemantics::Consumable;
    }
    return ResourceSemantics::Consumable;
}

bool is_consumptive(ResourceDimension dimension) noexcept {
    return semantics(dimension) != ResourceSemantics::EphemeralCapacity;
}

#define EXOTIC_ENUM_STRING_CASE(value) case value: return #value

std::string to_string(ResourceDimension value) {
    switch (value) {
        case ResourceDimension::MoneyUsd: return "money_usd";
        case ResourceDimension::ApiCredits: return "api_credits";
        case ResourceDimension::CpuMilliseconds: return "cpu_milliseconds";
        case ResourceDimension::GpuMilliseconds: return "gpu_milliseconds";
        case ResourceDimension::MemoryBytes: return "memory_bytes";
        case ResourceDimension::StorageBytes: return "storage_bytes";
        case ResourceDimension::NetworkBytes: return "network_bytes";
        case ResourceDimension::ConcurrencySlots: return "concurrency_slots";
    }
    return "money_usd";
}

std::string to_string(AccountScope value) {
    switch (value) {
        case AccountScope::Workspace: return "workspace";
        case AccountScope::Project: return "project";
        case AccountScope::Agent: return "agent";
        case AccountScope::Task: return "task";
    }
    return "workspace";
}

std::string to_string(AccountStatus value) {
    switch (value) {
        case AccountStatus::Active: return "active";
        case AccountStatus::Frozen: return "frozen";
        case AccountStatus::Closed: return "closed";
    }
    return "closed";
}

std::string to_string(ReservationStatus value) {
    switch (value) {
        case ReservationStatus::Active: return "active";
        case ReservationStatus::Reconciled: return "reconciled";
        case ReservationStatus::Released: return "released";
        case ReservationStatus::Expired: return "expired";
    }
    return "released";
}

std::string to_string(CircuitState value) {
    switch (value) {
        case CircuitState::Closed: return "closed";
        case CircuitState::Open: return "open";
        case CircuitState::HalfOpen: return "half_open";
    }
    return "open";
}

std::string to_string(AdmissionFailure value) {
    switch (value) {
        case AdmissionFailure::None: return "none";
        case AdmissionFailure::EmergencyStop: return "emergency_stop";
        case AdmissionFailure::AccountUnavailable: return "account_unavailable";
        case AdmissionFailure::BudgetExceeded: return "budget_exceeded";
        case AdmissionFailure::ApprovalRequired: return "approval_required";
        case AdmissionFailure::ApprovalInvalid: return "approval_invalid";
        case AdmissionFailure::RateLimited: return "rate_limited";
        case AdmissionFailure::CircuitOpen: return "circuit_open";
        case AdmissionFailure::InvalidRequest: return "invalid_request";
        case AdmissionFailure::DuplicateConflict: return "duplicate_conflict";
    }
    return "invalid_request";
}

std::string to_string(AnomalySeverity value) {
    switch (value) {
        case AnomalySeverity::Info: return "info";
        case AnomalySeverity::Warning: return "warning";
        case AnomalySeverity::Critical: return "critical";
    }
    return "warning";
}

std::optional<ResourceDimension> resource_dimension_from_string(std::string_view value) {
    if (value == "money_usd") return ResourceDimension::MoneyUsd;
    if (value == "api_credits") return ResourceDimension::ApiCredits;
    if (value == "cpu_milliseconds") return ResourceDimension::CpuMilliseconds;
    if (value == "gpu_milliseconds") return ResourceDimension::GpuMilliseconds;
    if (value == "memory_bytes") return ResourceDimension::MemoryBytes;
    if (value == "storage_bytes") return ResourceDimension::StorageBytes;
    if (value == "network_bytes") return ResourceDimension::NetworkBytes;
    if (value == "concurrency_slots") return ResourceDimension::ConcurrencySlots;
    return std::nullopt;
}

std::optional<AccountScope> account_scope_from_string(std::string_view value) {
    if (value == "workspace") return AccountScope::Workspace;
    if (value == "project") return AccountScope::Project;
    if (value == "agent") return AccountScope::Agent;
    if (value == "task") return AccountScope::Task;
    return std::nullopt;
}

std::optional<AccountStatus> account_status_from_string(std::string_view value) {
    if (value == "active") return AccountStatus::Active;
    if (value == "frozen") return AccountStatus::Frozen;
    if (value == "closed") return AccountStatus::Closed;
    return std::nullopt;
}

std::optional<ReservationStatus> reservation_status_from_string(std::string_view value) {
    if (value == "active") return ReservationStatus::Active;
    if (value == "reconciled") return ReservationStatus::Reconciled;
    if (value == "released") return ReservationStatus::Released;
    if (value == "expired") return ReservationStatus::Expired;
    return std::nullopt;
}

std::optional<CircuitState> circuit_state_from_string(std::string_view value) {
    if (value == "closed") return CircuitState::Closed;
    if (value == "open") return CircuitState::Open;
    if (value == "half_open") return CircuitState::HalfOpen;
    return std::nullopt;
}

std::optional<AnomalySeverity> anomaly_severity_from_string(std::string_view value) {
    if (value == "info") return AnomalySeverity::Info;
    if (value == "warning") return AnomalySeverity::Warning;
    if (value == "critical") return AnomalySeverity::Critical;
    return std::nullopt;
}

} // namespace exotic::autonomy::resources
