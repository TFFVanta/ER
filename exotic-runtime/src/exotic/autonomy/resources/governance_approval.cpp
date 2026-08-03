#include "governance_approval.hpp"

namespace exotic::autonomy::resources {

GovernanceBudgetApprovalVerifier::GovernanceBudgetApprovalVerifier(
    governance::GovernanceRepository& repository
) : repository_(repository) {}

bool GovernanceBudgetApprovalVerifier::approves(
    GovernanceApprovalId approval_id,
    ProposalId proposal_id,
    double requested_usd,
    TimePoint now,
    std::string& reason
) {
    const auto request = repository_.load_request(approval_id);
    if (!request) {
        reason = "governance approval request was not found";
        return false;
    }
    if (request->status != governance::ApprovalStatus::Approved) {
        reason = "governance approval is not approved";
        return false;
    }
    if (request->proposal_id != proposal_id) {
        reason = "governance approval belongs to a different proposal";
        return false;
    }
    if (request->action != "proposal.execute") {
        reason = "governance approval does not authorize proposal execution";
        return false;
    }
    if (request->resource.type != "proposal" || request->resource.id != std::to_string(proposal_id)) {
        reason = "governance approval scope does not match the proposal";
        return false;
    }
    if (request->expires_at <= now) {
        reason = "governance approval has expired";
        return false;
    }
    if (request->simulation_only) {
        reason = "simulation-only approval cannot authorize real resource consumption";
        return false;
    }
    if (request->requested_budget_usd + 1e-9 < requested_usd) {
        reason = "governance approval budget is lower than the resource request";
        return false;
    }
    reason = "governance budget approval is valid";
    return true;
}

} // namespace exotic::autonomy::resources
