#include "exotic/autonomy/resources/in_memory_repository.hpp"
#include "exotic/autonomy/resources/scheduler_bridge.hpp"

#include <cassert>

namespace {

class ApprovalVerifier final : public exotic::autonomy::resources::BudgetApprovalVerifier {
public:
    bool approves(
        exotic::autonomy::resources::GovernanceApprovalId,
        exotic::autonomy::ProposalId,
        double,
        exotic::autonomy::TimePoint,
        std::string& reason
    ) override {
        reason = "approved";
        return true;
    }
};

class AllowAuthority final : public exotic::autonomy::resources::SchedulerAuthorityValidator {
public:
    exotic::autonomy::resources::SchedulerAuthorityDecision validate(
        const exotic::autonomy::scheduler::Job&,
        const exotic::autonomy::resources::ResourcePlan& plan
    ) override {
        return {true, plan.simulation, false, "allowed", plan.governance_approval_id};
    }
};

class InnerExecution final : public exotic::autonomy::scheduler::ExecutionBridge {
public:
    int calls{0};
    exotic::autonomy::scheduler::ExecutionResult execute(
        const exotic::autonomy::scheduler::Job&,
        std::stop_token
    ) override {
        ++calls;
        return {true, exotic::autonomy::scheduler::FailureClass::Permanent, "done"};
    }
};

} // namespace

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::resources;

    InMemoryResourceRepository repository;
    ApprovalVerifier approvals;
    ResourceGovernor governor{repository, approvals};

    ResourceAccount account;
    account.scope = AccountScope::Agent;
    account.scope_id = "worker";
    account.name = "Worker";
    account.limits = {
        {ResourceDimension::MoneyUsd, 10.0, 8.0, 0.0, 0.0},
        {ResourceDimension::ConcurrencySlots, 1.0, 1.0, 0.0, 0.0}
    };
    const auto account_id = governor.create_account(account);

    FixedJobResourcePlanner planner{
        account_id,
        {
            {ResourceDimension::MoneyUsd, 1.0},
            {ResourceDimension::ConcurrencySlots, 1.0}
        },
        std::chrono::seconds{5}
    };
    AllowAuthority authority;
    EstimatedUsageMeter meter;
    InnerExecution inner;
    GovernedResourceExecutionBridge bridge{authority, governor, planner, meter, inner};

    scheduler::Job job;
    job.id = 1;
    job.proposal_id = 1;
    job.name = "bridge-test";

    const auto result = bridge.execute(job, {});
    assert(result.success);
    assert(inner.calls == 1);
    assert(repository.load_active_reservations().empty());
    return 0;
}
