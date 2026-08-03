#pragma once

#include "approval.hpp"
#include "../governance/repository.hpp"

namespace exotic::autonomy::resources {

class GovernanceBudgetApprovalVerifier final : public BudgetApprovalVerifier {
public:
    explicit GovernanceBudgetApprovalVerifier(
        governance::GovernanceRepository& repository
    );

    bool approves(
        GovernanceApprovalId approval_id,
        ProposalId proposal_id,
        double requested_usd,
        TimePoint now,
        std::string& reason
    ) override;

private:
    governance::GovernanceRepository& repository_;
};

} // namespace exotic::autonomy::resources
