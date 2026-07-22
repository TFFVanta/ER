#include "exotic/autonomy/resources/governor.hpp"
#include "exotic/autonomy/resources/in_memory_repository.hpp"

#include <cassert>

namespace {

class ApprovalVerifier final : public exotic::autonomy::resources::BudgetApprovalVerifier {
public:
    bool valid{true};

    bool approves(
        exotic::autonomy::resources::GovernanceApprovalId,
        exotic::autonomy::ProposalId,
        double,
        exotic::autonomy::TimePoint,
        std::string& reason
    ) override {
        reason = valid ? "approved" : "denied";
        return valid;
    }
};

exotic::autonomy::resources::ResourceLimit limit(
    exotic::autonomy::resources::ResourceDimension dimension,
    double hard
) {
    return {dimension, hard, hard * 0.8, 0.0, 0.0};
}

} // namespace

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::resources;

    InMemoryResourceRepository repository;
    ApprovalVerifier approvals;
    ResourceGovernor governor{repository, approvals};

    ResourceAccount workspace;
    workspace.scope = AccountScope::Workspace;
    workspace.scope_id = "main";
    workspace.name = "Main workspace";
    workspace.approval_threshold_usd = 5.0;
    workspace.limits = {
        limit(ResourceDimension::MoneyUsd, 100.0),
        limit(ResourceDimension::ApiCredits, 1000.0),
        limit(ResourceDimension::ConcurrencySlots, 4.0)
    };
    const auto workspace_id = governor.create_account(workspace);

    ResourceAccount project;
    project.parent_id = workspace_id;
    project.scope = AccountScope::Project;
    project.scope_id = "autonomy";
    project.name = "Autonomy project";
    project.limits = {
        limit(ResourceDimension::MoneyUsd, 20.0),
        limit(ResourceDimension::ApiCredits, 200.0),
        limit(ResourceDimension::ConcurrencySlots, 2.0)
    };
    const auto project_id = governor.create_account(project);

    AdmissionRequest request;
    request.job_id = 1;
    request.proposal_id = 7;
    request.leaf_account_id = project_id;
    request.workload_key = "test-workload";
    request.idempotency_key = "job-1-attempt-1";
    request.governance_approval_id = 99;
    request.estimate = {
        {ResourceDimension::MoneyUsd, 6.0},
        {ResourceDimension::ApiCredits, 20.0},
        {ResourceDimension::ConcurrencySlots, 1.0}
    };

    const auto admitted = governor.admit(request);
    assert(admitted.allowed);
    assert(admitted.reservation.has_value());

    const auto replay = governor.admit(request);
    assert(replay.allowed);
    assert(replay.reservation->id == admitted.reservation->id);

    ResourceVector actual{
        {ResourceDimension::MoneyUsd, 8.0},
        {ResourceDimension::ApiCredits, 30.0},
        {ResourceDimension::ConcurrencySlots, 0.0}
    };
    assert(governor.reconcile(admitted.reservation->id, actual, "test"));

    const auto root = repository.load_account(workspace_id);
    const auto child = repository.load_account(project_id);
    assert(root && child);
    assert(root->limits.front().spent == 8.0);
    assert(child->limits.front().spent == 8.0);
    assert(repository.load_anomalies(10).size() >= 1);

    request.idempotency_key = "job-2-attempt-1";
    request.job_id = 2;
    request.estimate.set(ResourceDimension::MoneyUsd, 30.0);
    const auto denied = governor.admit(request);
    assert(!denied.allowed);
    assert(denied.failure == AdmissionFailure::BudgetExceeded);

    governor.emergency_stop("test", "stop");
    request.idempotency_key = "job-3-attempt-1";
    request.job_id = 3;
    request.estimate.set(ResourceDimension::MoneyUsd, 1.0);
    const auto stopped = governor.admit(request);
    assert(!stopped.allowed);
    assert(stopped.failure == AdmissionFailure::EmergencyStop);
    governor.clear_emergency_stop("test", "resume");

    return 0;
}
