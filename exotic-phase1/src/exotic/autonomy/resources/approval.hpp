#pragma once

#include "types.hpp"

#include <string>

namespace exotic::autonomy::resources {

class BudgetApprovalVerifier {
public:
    virtual ~BudgetApprovalVerifier() = default;

    virtual bool approves(
        GovernanceApprovalId approval_id,
        ProposalId proposal_id,
        double requested_usd,
        TimePoint now,
        std::string& reason
    ) = 0;
};

class DenyBudgetApprovalVerifier final : public BudgetApprovalVerifier {
public:
    bool approves(
        GovernanceApprovalId,
        ProposalId,
        double,
        TimePoint,
        std::string& reason
    ) override {
        reason = "no governance budget verifier is configured";
        return false;
    }
};

} // namespace exotic::autonomy::resources
