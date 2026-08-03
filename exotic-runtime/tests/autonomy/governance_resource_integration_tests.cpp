#include "exotic/autonomy/governance/authority_gate.hpp"
#include "exotic/autonomy/governance/service.hpp"
#include "exotic/autonomy/governance/sqlite_repository.hpp"
#include "exotic/autonomy/resources/governance_approval.hpp"
#include "exotic/autonomy/resources/scheduler_bridge.hpp"
#include "exotic/autonomy/resources/sqlite_repository.hpp"

#include <cassert>
#include <filesystem>

namespace {

class ApprovedPlanner final : public exotic::autonomy::resources::JobResourcePlanner {
public:
    ApprovedPlanner(
        exotic::autonomy::resources::ResourceAccountId account_id,
        exotic::autonomy::resources::GovernanceApprovalId approval_id
    ) : account_id_(account_id), approval_id_(approval_id) {}

    exotic::autonomy::resources::ResourcePlan plan(
        const exotic::autonomy::scheduler::Job& job
    ) override {
        exotic::autonomy::resources::ResourcePlan plan;
        plan.leaf_account_id = account_id_;
        plan.estimate = {
            {exotic::autonomy::resources::ResourceDimension::MoneyUsd, 1.0},
            {exotic::autonomy::resources::ResourceDimension::ConcurrencySlots, 1.0}
        };
        plan.workload_key = "approved-workload";
        plan.idempotency_key = "approved:" + std::to_string(job.id);
        plan.governance_approval_id = approval_id_;
        plan.reservation_ttl = std::chrono::seconds{5};
        return plan;
    }

private:
    exotic::autonomy::resources::ResourceAccountId account_id_;
    exotic::autonomy::resources::GovernanceApprovalId approval_id_;
};

class InnerExecution final : public exotic::autonomy::scheduler::ExecutionBridge {
public:
    exotic::autonomy::scheduler::ExecutionResult execute(
        const exotic::autonomy::scheduler::Job&,
        std::stop_token
    ) override {
        return {true, exotic::autonomy::scheduler::FailureClass::Permanent, "executed"};
    }
};

} // namespace

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::governance;
    using namespace exotic::autonomy::resources;

    const auto path = std::filesystem::temp_directory_path() / "exotic-governance-resource-v05.db";
    std::filesystem::remove(path);
    std::filesystem::remove(path.string() + "-wal");
    std::filesystem::remove(path.string() + "-shm");

    {
    SqliteGovernanceRepository governance_repository{path};
    GovernanceService governance_service{governance_repository};
    AuthorityGate authority_gate{governance_service};

    CapabilityGrant grant;
    grant.id = governance_repository.next_grant_id();
    grant.subject_id = "worker.1";
    grant.capability = {"proposal.execute", "proposal", "proposal:1"};
    grant.maximum_autonomy = AutonomyLevel::Bounded;
    grant.budget_limit_usd = 10.0;
    grant.granted_by = "security";
    governance_repository.save_grant(grant);

    PolicyVersion policy;
    policy.id = governance_repository.next_policy_id();
    policy.name = "allow-proposal-execution";
    policy.rules.push_back({
        "allow-execute",
        Effect::Allow,
        "proposal.execute",
        "proposal",
        "operator",
        "environment",
        "test",
        RiskLevel::Minimal,
        false
    });
    governance_repository.save_policy(policy);

    ApprovalRequest approval;
    approval.id = governance_repository.next_request_id();
    approval.proposal_id = 1;
    approval.requester_id = "requester.1";
    approval.action = "proposal.execute";
    approval.resource = {"proposal", "1", {}};
    approval.risk = RiskLevel::High;
    approval.requested_autonomy = AutonomyLevel::Bounded;
    approval.requested_budget_usd = 2.0;
    approval.status = ApprovalStatus::Approved;
    approval.expires_at = Clock::now() + std::chrono::hours{1};
    approval.decided_at = Clock::now();
    governance_repository.save_request(approval);

    SqliteResourceRepository resource_repository{path};
    GovernanceBudgetApprovalVerifier budget_verifier{governance_repository};
    ResourceGovernor governor{resource_repository, budget_verifier};

    ResourceAccount account;
    account.scope = AccountScope::Agent;
    account.scope_id = "worker.1";
    account.name = "Worker resource account";
    account.approval_threshold_usd = 0.5;
    account.limits = {
        {ResourceDimension::MoneyUsd, 10.0, 8.0, 0.0, 0.0},
        {ResourceDimension::ConcurrencySlots, 1.0, 1.0, 0.0, 0.0}
    };
    const auto account_id = governor.create_account(account);

    Subject worker{
        "worker.1",
        {"operator"},
        {{"environment", "test"}}
    };
    GovernanceSchedulerAuthorityValidator authority{
        authority_gate,
        governance_repository,
        worker
    };
    ApprovedPlanner planner{account_id, approval.id};
    EstimatedUsageMeter meter;
    InnerExecution inner;
    GovernedResourceExecutionBridge bridge{authority, governor, planner, meter, inner};

    scheduler::Job job;
    job.id = 1;
    job.proposal_id = 1;
    job.priority = scheduler::JobPriority::High;
    job.name = "approved-resource-execution";

    const auto result = bridge.execute(job, {});
    assert(result.success);
    assert(resource_repository.load_active_reservations().empty());
    }
    std::filesystem::remove(path);
    std::filesystem::remove(path.string() + "-wal");
    std::filesystem::remove(path.string() + "-shm");
    return 0;
}
