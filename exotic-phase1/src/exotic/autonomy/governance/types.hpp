#pragma once
#include "../types.hpp"
#include <chrono>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>
namespace exotic::autonomy::governance {
using ApprovalRequestId=std::uint64_t; using DecisionId=std::uint64_t; using GrantId=std::uint64_t; using PolicyId=std::uint64_t; using EvidenceId=std::uint64_t;
enum class ApprovalStatus{Pending,Approved,Rejected,Expired,Revoked}; enum class Vote{Approve,Reject,Abstain}; enum class Effect{Allow,Deny,Escalate};
enum class AutonomyLevel:std::uint8_t{Observe=0,Recommend=1,Prepare=2,ExecuteWithApproval=3,Bounded=4,Trusted=5};
struct Subject{std::string id; std::vector<std::string> roles; std::unordered_map<std::string,std::string> attributes;};
struct Resource{std::string type; std::string id; std::unordered_map<std::string,std::string> attributes;};
struct Capability{std::string action; std::string resource_type; std::string scope;};
struct CapabilityGrant{GrantId id{}; std::string subject_id; Capability capability; AutonomyLevel maximum_autonomy{AutonomyLevel::Observe}; double budget_limit_usd{}; TimePoint valid_from{Clock::now()}; std::optional<TimePoint> valid_until; bool revoked{}; std::string granted_by;};
struct PolicyRule{std::string id; Effect effect{Effect::Deny}; std::string action; std::string resource_type; std::string required_role; std::string attribute_key; std::string attribute_value; RiskLevel minimum_risk{RiskLevel::Minimal}; bool simulation_only{};};
struct PolicyVersion{PolicyId id{}; std::string name; std::uint32_t version{1}; bool active{true}; TimePoint created_at{Clock::now()}; std::vector<PolicyRule> rules;};
struct ApprovalRequest{ApprovalRequestId id{}; ProposalId proposal_id{}; std::string requester_id; std::string action; Resource resource; RiskLevel risk{RiskLevel::Low}; AutonomyLevel requested_autonomy{AutonomyLevel::ExecuteWithApproval}; double requested_budget_usd{}; std::uint32_t required_approvals{1}; bool require_distinct_roles{}; bool simulation_only{}; ApprovalStatus status{ApprovalStatus::Pending}; TimePoint created_at{Clock::now()}; TimePoint expires_at{Clock::now()+std::chrono::hours(24)}; std::optional<TimePoint> decided_at;};
struct ApprovalDecision{DecisionId id{}; ApprovalRequestId request_id{}; std::string approver_id; std::string approver_role; Vote vote{Vote::Abstain}; std::string reason; TimePoint created_at{Clock::now()};};
struct DecisionEvidence{EvidenceId id{}; ApprovalRequestId request_id{}; std::string event_type; std::string actor; std::string payload_json{"{}"}; std::string previous_hash; std::string hash; TimePoint created_at{Clock::now()};};
struct AuthorityContext{Subject subject; Resource resource; std::string action; RiskLevel risk{RiskLevel::Low}; AutonomyLevel requested_autonomy{AutonomyLevel::ExecuteWithApproval}; double budget_usd{}; bool simulation{}; ProposalId proposal_id{};};
struct AuthorityResult{bool allowed{}; bool approval_required{}; bool emergency_stopped{}; std::string reason; std::optional<ApprovalRequestId> request_id;};
std::string to_string(ApprovalStatus); std::string to_string(Vote); std::string to_string(Effect); std::optional<ApprovalStatus> approval_status_from_string(std::string_view); std::optional<Vote> vote_from_string(std::string_view);
}
