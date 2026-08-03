#include "types.hpp"

#include <algorithm>
#include <cmath>

namespace exotic::autonomy::agents {
namespace {
template <typename Enum>
std::optional<Enum> none() { return std::nullopt; }
}

std::string to_string(AgentStatus value) {
    switch (value) {
        case AgentStatus::Registered: return "registered";
        case AgentStatus::Active: return "active";
        case AgentStatus::Draining: return "draining";
        case AgentStatus::Offline: return "offline";
        case AgentStatus::Unhealthy: return "unhealthy";
        case AgentStatus::Revoked: return "revoked";
    }
    return "registered";
}
std::string to_string(Availability value) {
    switch (value) {
        case Availability::Available: return "available";
        case Availability::Busy: return "busy";
        case Availability::Unavailable: return "unavailable";
    }
    return "unavailable";
}
std::string to_string(HealthState value) {
    switch (value) {
        case HealthState::Unknown: return "unknown";
        case HealthState::Healthy: return "healthy";
        case HealthState::Degraded: return "degraded";
        case HealthState::Unhealthy: return "unhealthy";
    }
    return "unknown";
}
std::string to_string(TrustLevel value) {
    switch (value) {
        case TrustLevel::Untrusted: return "untrusted";
        case TrustLevel::Restricted: return "restricted";
        case TrustLevel::Standard: return "standard";
        case TrustLevel::Elevated: return "elevated";
        case TrustLevel::Critical: return "critical";
    }
    return "untrusted";
}
std::string to_string(WorkPlanMode value) {
    switch (value) {
        case WorkPlanMode::Single: return "single";
        case WorkPlanMode::Parallel: return "parallel";
        case WorkPlanMode::Sequential: return "sequential";
        case WorkPlanMode::SupervisorWorkers: return "supervisor_workers";
    }
    return "single";
}
std::string to_string(AssignmentStatus value) {
    switch (value) {
        case AssignmentStatus::Planned: return "planned";
        case AssignmentStatus::Bound: return "bound";
        case AssignmentStatus::Running: return "running";
        case AssignmentStatus::Completed: return "completed";
        case AssignmentStatus::Failed: return "failed";
        case AssignmentStatus::Replacing: return "replacing";
        case AssignmentStatus::Cancelled: return "cancelled";
        case AssignmentStatus::Interrupted: return "interrupted";
    }
    return "planned";
}
std::string to_string(PerformanceOutcome value) {
    switch (value) {
        case PerformanceOutcome::Success: return "success";
        case PerformanceOutcome::Failure: return "failure";
        case PerformanceOutcome::Timeout: return "timeout";
        case PerformanceOutcome::Cancelled: return "cancelled";
        case PerformanceOutcome::Replaced: return "replaced";
        case PerformanceOutcome::VerificationFailed: return "verification_failed";
    }
    return "failure";
}
std::string to_string(CompatibilityFailure value) {
    switch (value) {
        case CompatibilityFailure::None: return "none";
        case CompatibilityFailure::GovernanceDenied: return "governance_denied";
        case CompatibilityFailure::ResourceIncompatible: return "resource_incompatible";
        case CompatibilityFailure::CapabilityMissing: return "capability_missing";
        case CompatibilityFailure::ToolDenied: return "tool_denied";
        case CompatibilityFailure::TrustInsufficient: return "trust_insufficient";
        case CompatibilityFailure::DomainMismatch: return "domain_mismatch";
        case CompatibilityFailure::Unavailable: return "unavailable";
        case CompatibilityFailure::Unhealthy: return "unhealthy";
        case CompatibilityFailure::CostExceeded: return "cost_exceeded";
        case CompatibilityFailure::NoCandidate: return "no_candidate";
        case CompatibilityFailure::InvalidRequirement: return "invalid_requirement";
    }
    return "invalid_requirement";
}

std::optional<AgentStatus> agent_status_from_string(std::string_view value) {
    if (value == "registered") return AgentStatus::Registered;
    if (value == "active") return AgentStatus::Active;
    if (value == "draining") return AgentStatus::Draining;
    if (value == "offline") return AgentStatus::Offline;
    if (value == "unhealthy") return AgentStatus::Unhealthy;
    if (value == "revoked") return AgentStatus::Revoked;
    return none<AgentStatus>();
}
std::optional<Availability> availability_from_string(std::string_view value) {
    if (value == "available") return Availability::Available;
    if (value == "busy") return Availability::Busy;
    if (value == "unavailable") return Availability::Unavailable;
    return none<Availability>();
}
std::optional<HealthState> health_state_from_string(std::string_view value) {
    if (value == "unknown") return HealthState::Unknown;
    if (value == "healthy") return HealthState::Healthy;
    if (value == "degraded") return HealthState::Degraded;
    if (value == "unhealthy") return HealthState::Unhealthy;
    return none<HealthState>();
}
std::optional<TrustLevel> trust_level_from_string(std::string_view value) {
    if (value == "untrusted") return TrustLevel::Untrusted;
    if (value == "restricted") return TrustLevel::Restricted;
    if (value == "standard") return TrustLevel::Standard;
    if (value == "elevated") return TrustLevel::Elevated;
    if (value == "critical") return TrustLevel::Critical;
    return none<TrustLevel>();
}
std::optional<WorkPlanMode> work_plan_mode_from_string(std::string_view value) {
    if (value == "single") return WorkPlanMode::Single;
    if (value == "parallel") return WorkPlanMode::Parallel;
    if (value == "sequential") return WorkPlanMode::Sequential;
    if (value == "supervisor_workers") return WorkPlanMode::SupervisorWorkers;
    return none<WorkPlanMode>();
}
std::optional<AssignmentStatus> assignment_status_from_string(std::string_view value) {
    if (value == "planned") return AssignmentStatus::Planned;
    if (value == "bound") return AssignmentStatus::Bound;
    if (value == "running") return AssignmentStatus::Running;
    if (value == "completed") return AssignmentStatus::Completed;
    if (value == "failed") return AssignmentStatus::Failed;
    if (value == "replacing") return AssignmentStatus::Replacing;
    if (value == "cancelled") return AssignmentStatus::Cancelled;
    if (value == "interrupted") return AssignmentStatus::Interrupted;
    return none<AssignmentStatus>();
}
std::optional<PerformanceOutcome> performance_outcome_from_string(std::string_view value) {
    if (value == "success") return PerformanceOutcome::Success;
    if (value == "failure") return PerformanceOutcome::Failure;
    if (value == "timeout") return PerformanceOutcome::Timeout;
    if (value == "cancelled") return PerformanceOutcome::Cancelled;
    if (value == "replaced") return PerformanceOutcome::Replaced;
    if (value == "verification_failed") return PerformanceOutcome::VerificationFailed;
    return none<PerformanceOutcome>();
}

double clamp_score(double value) noexcept {
    if (!std::isfinite(value)) return 0.0;
    return std::clamp(value, kMinimumScore, kMaximumScore);
}

bool trust_satisfies(TrustLevel actual, TrustLevel required) noexcept {
    return static_cast<std::uint8_t>(actual) >= static_cast<std::uint8_t>(required);
}

} // namespace exotic::autonomy::agents
