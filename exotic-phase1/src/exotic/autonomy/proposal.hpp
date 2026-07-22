#pragma once
#include "types.hpp"
#include <string>
#include <vector>
namespace exotic::autonomy {
struct ActionStep { std::string name; std::string description; bool reversible{false}; };
struct ActionPlan { std::string name; std::vector<ActionStep> steps; };
struct CostEstimate { double estimated_usd{0.0}; double estimated_compute_seconds{0.0}; double estimated_duration_seconds{0.0}; };
struct Proposal {
    ProposalId id{0}; ObjectiveId objective_id{0}; std::string proposed_by; ActionPlan plan;
    RiskLevel risk{RiskLevel::Low}; CostEstimate cost; double expected_value{0.0}; double confidence{0.0};
    bool human_approval_required{false}; ProposalStatus status{ProposalStatus::Draft}; TimePoint created_at{Clock::now()};
};
}
