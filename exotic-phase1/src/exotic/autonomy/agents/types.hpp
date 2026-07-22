#pragma once

#include "../types.hpp"
#include "../scheduler/types.hpp"
#include "../resources/types.hpp"

#include <chrono>
#include <cstdint>
#include <map>
#include <optional>
#include <set>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace exotic::autonomy::agents {

using AgentId = std::uint64_t;
using CapabilityDefinitionId = std::uint64_t;
using CapabilityEvidenceId = std::uint64_t;
using PerformanceRecordId = std::uint64_t;
using AssignmentId = std::uint64_t;
using AssignmentVersion = std::uint32_t;
using WorkerBindingId = std::uint64_t;

using GovernanceApprovalId = resources::GovernanceApprovalId;
using ResourceAccountId = resources::ResourceAccountId;

constexpr double kMinimumScore = 0.0;
constexpr double kMaximumScore = 1.0;

enum class AgentStatus : std::uint8_t {
    Registered,
    Active,
    Draining,
    Offline,
    Unhealthy,
    Revoked
};

enum class Availability : std::uint8_t {
    Available,
    Busy,
    Unavailable
};

enum class HealthState : std::uint8_t {
    Unknown,
    Healthy,
    Degraded,
    Unhealthy
};

enum class TrustLevel : std::uint8_t {
    Untrusted = 0,
    Restricted = 1,
    Standard = 2,
    Elevated = 3,
    Critical = 4
};

enum class WorkPlanMode : std::uint8_t {
    Single,
    Parallel,
    Sequential,
    SupervisorWorkers
};

enum class AssignmentStatus : std::uint8_t {
    Planned,
    Bound,
    Running,
    Completed,
    Failed,
    Replacing,
    Cancelled,
    Interrupted
};

enum class PerformanceOutcome : std::uint8_t {
    Success,
    Failure,
    Timeout,
    Cancelled,
    Replaced,
    VerificationFailed
};

enum class CompatibilityFailure : std::uint8_t {
    None,
    GovernanceDenied,
    ResourceIncompatible,
    CapabilityMissing,
    ToolDenied,
    TrustInsufficient,
    DomainMismatch,
    Unavailable,
    Unhealthy,
    CostExceeded,
    NoCandidate,
    InvalidRequirement
};

struct SpecialistProfile {
    std::string title;
    std::string primary_domain;
    std::string specialty;
    std::string description;
    std::vector<std::string> tags;
};

struct RuntimeMetadata {
    std::string runtime_kind{"process"};
    std::string runtime_version;
    std::string model_provider;
    std::string model_name;
    std::string model_version;
    std::string endpoint;
    std::uint64_t maximum_context_tokens{0};
    bool supports_tools{false};
    bool supports_parallel_work{false};
    std::unordered_map<std::string, std::string> attributes;
};

struct CostProfile {
    double fixed_cost_usd{0.0};
    double hourly_cost_usd{0.0};
    double input_token_cost_per_million_usd{0.0};
    double output_token_cost_per_million_usd{0.0};
    double api_credits_per_task{0.0};
};

struct WorkloadState {
    std::uint32_t active_tasks{0};
    std::uint32_t maximum_tasks{1};
    double utilization{0.0};
    TimePoint updated_at{Clock::now()};
};

struct AgentIdentity {
    AgentId id{0};
    std::string identity_key;
    std::string display_name;
    AgentStatus status{AgentStatus::Registered};
    Availability availability{Availability::Available};
    HealthState health{HealthState::Unknown};
    TrustLevel trust{TrustLevel::Restricted};
    SpecialistProfile specialist;
    RuntimeMetadata runtime;
    CostProfile cost;
    WorkloadState workload;
    std::vector<std::string> roles;
    std::unordered_map<std::string, std::string> attributes;
    std::vector<std::string> domain_scopes;
    std::optional<ResourceAccountId> resource_account_id;
    TimePoint registered_at{Clock::now()};
    TimePoint updated_at{Clock::now()};
    std::optional<TimePoint> revoked_at;
    std::optional<TimePoint> last_heartbeat_at;
    std::string revocation_reason;
};

struct CapabilityDefinition {
    CapabilityDefinitionId id{0};
    std::string key;
    std::optional<std::string> parent_key;
    std::string domain;
    std::string name;
    std::string description;
    std::vector<std::string> required_tools;
    bool active{true};
    TimePoint created_at{Clock::now()};
};

struct AgentCapability {
    AgentId agent_id{0};
    std::string capability_key;
    double proficiency{0.0};
    double reliability{0.0};
    std::uint64_t successful_uses{0};
    std::uint64_t failed_uses{0};
    TimePoint last_validated_at{Clock::now()};
};

struct ToolPermission {
    AgentId agent_id{0};
    std::string tool_key;
    std::set<std::string> operations;
    std::string scope{"*"};
    bool allowed{true};
    TimePoint valid_from{Clock::now()};
    std::optional<TimePoint> valid_until;
};

struct CapabilityEvidence {
    CapabilityEvidenceId id{0};
    AgentId agent_id{0};
    std::string capability_key;
    std::string evidence_type;
    std::string reference;
    double confidence{0.0};
    std::string payload_json{"{}"};
    TimePoint created_at{Clock::now()};
};

struct CapabilityRequirement {
    std::string capability_key;
    double minimum_proficiency{0.0};
    double minimum_reliability{0.0};
    bool required{true};
    double weight{1.0};
};

struct ToolRequirement {
    std::string tool_key;
    std::string operation;
    std::string scope{"*"};
    bool required{true};
};

struct TaskRequirement {
    scheduler::JobId job_id{0};
    ProposalId proposal_id{0};
    std::string action{"proposal.execute"};
    std::string domain;
    std::vector<CapabilityRequirement> capabilities;
    std::vector<ToolRequirement> tools;
    TrustLevel minimum_trust{TrustLevel::Restricted};
    std::uint32_t minimum_team_size{1};
    std::uint32_t preferred_team_size{1};
    std::uint32_t maximum_team_size{1};
    WorkPlanMode mode{WorkPlanMode::Single};
    bool supervisor_required{false};
    std::optional<std::string> supervisor_capability;
    double maximum_team_cost_usd{0.0};
    double estimated_duration_hours{0.0};
    resources::ResourceVector resource_estimate;
    ResourceAccountId resource_account_id{0};
    std::optional<GovernanceApprovalId> governance_approval_id;
    std::chrono::milliseconds reservation_ttl{std::chrono::minutes(10)};
    bool simulation{false};
    std::vector<AgentId> excluded_agents;
    std::unordered_map<std::string, std::string> constraints;
};

struct CandidateScore {
    AgentId agent_id{0};
    bool eligible{false};
    double total{0.0};
    double capability_fit{0.0};
    double reliability{0.0};
    double trust_fit{0.0};
    double availability_fit{0.0};
    double health_fit{0.0};
    double workload_fit{0.0};
    double cost_fit{0.0};
    double domain_fit{0.0};
    CompatibilityFailure failure{CompatibilityFailure::None};
    std::string reason;
    std::vector<std::string> covered_capabilities;
};

struct WorkStage {
    std::uint32_t index{0};
    std::string name;
    WorkPlanMode mode{WorkPlanMode::Single};
    std::vector<AgentId> agent_ids;
    std::vector<std::uint32_t> depends_on_stages;
};

struct WorkPlan {
    WorkPlanMode mode{WorkPlanMode::Single};
    std::optional<AgentId> supervisor_id;
    std::vector<AgentId> agent_ids;
    std::vector<WorkStage> stages;
    double estimated_cost_usd{0.0};
    double score{0.0};
};

struct WorkAssignment {
    AssignmentId id{0};
    AssignmentVersion version{1};
    scheduler::JobId job_id{0};
    ProposalId proposal_id{0};
    AssignmentStatus status{AssignmentStatus::Planned};
    TaskRequirement requirement;
    WorkPlan plan;
    std::optional<resources::ReservationId> reservation_id;
    std::string continuity_key;
    TimePoint created_at{Clock::now()};
    TimePoint updated_at{Clock::now()};
    std::optional<TimePoint> started_at;
    std::optional<TimePoint> completed_at;
    std::string failure_reason;
};

struct WorkerBinding {
    WorkerBindingId id{0};
    AssignmentId assignment_id{0};
    scheduler::JobId job_id{0};
    AgentId agent_id{0};
    std::string worker_key;
    TimePoint bound_at{Clock::now()};
    TimePoint heartbeat_at{Clock::now()};
    TimePoint expires_at{Clock::now() + std::chrono::seconds(30)};
    bool released{false};
};

struct PerformanceRecord {
    PerformanceRecordId id{0};
    AgentId agent_id{0};
    AssignmentId assignment_id{0};
    scheduler::JobId job_id{0};
    std::string capability_key;
    PerformanceOutcome outcome{PerformanceOutcome::Failure};
    double quality_score{0.0};
    double verification_confidence{0.0};
    std::chrono::milliseconds duration{0};
    double actual_cost_usd{0.0};
    std::string reason;
    TimePoint created_at{Clock::now()};
};

struct AllocationDecision {
    bool allocated{false};
    CompatibilityFailure failure{CompatibilityFailure::None};
    std::string reason;
    std::optional<WorkAssignment> assignment;
    std::vector<CandidateScore> candidates;
};

struct CompatibilityDecision {
    bool allowed{false};
    bool simulation{false};
    CompatibilityFailure failure{CompatibilityFailure::None};
    std::string reason;
};

struct RegistryStatus {
    std::uint64_t registered{0};
    std::uint64_t active{0};
    std::uint64_t available{0};
    std::uint64_t unhealthy{0};
    std::uint64_t revoked{0};
    std::uint64_t running_assignments{0};
    std::uint64_t stale_bindings{0};
};

std::string to_string(AgentStatus value);
std::string to_string(Availability value);
std::string to_string(HealthState value);
std::string to_string(TrustLevel value);
std::string to_string(WorkPlanMode value);
std::string to_string(AssignmentStatus value);
std::string to_string(PerformanceOutcome value);
std::string to_string(CompatibilityFailure value);

std::optional<AgentStatus> agent_status_from_string(std::string_view value);
std::optional<Availability> availability_from_string(std::string_view value);
std::optional<HealthState> health_state_from_string(std::string_view value);
std::optional<TrustLevel> trust_level_from_string(std::string_view value);
std::optional<WorkPlanMode> work_plan_mode_from_string(std::string_view value);
std::optional<AssignmentStatus> assignment_status_from_string(std::string_view value);
std::optional<PerformanceOutcome> performance_outcome_from_string(std::string_view value);

[[nodiscard]] double clamp_score(double value) noexcept;
[[nodiscard]] bool trust_satisfies(TrustLevel actual, TrustLevel required) noexcept;

} // namespace exotic::autonomy::agents
