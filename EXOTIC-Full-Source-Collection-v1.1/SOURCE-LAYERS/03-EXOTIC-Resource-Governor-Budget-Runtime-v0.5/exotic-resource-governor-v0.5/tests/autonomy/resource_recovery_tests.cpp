#include "exotic/autonomy/resources/governor.hpp"
#include "exotic/autonomy/resources/in_memory_repository.hpp"
#include "exotic/autonomy/resources/recovery.hpp"

#include <cassert>

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::resources;

    InMemoryResourceRepository repository;
    DenyBudgetApprovalVerifier approvals;
    ResourceGovernor governor{repository, approvals};

    ResourceAccount account;
    account.scope = AccountScope::Task;
    account.scope_id = "recovery";
    account.name = "Recovery account";
    account.limits = {
        {ResourceDimension::ConcurrencySlots, 1.0, 1.0, 0.0, 0.0}
    };
    const auto account_id = governor.create_account(account);

    AdmissionRequest request;
    request.job_id = 1;
    request.proposal_id = 1;
    request.leaf_account_id = account_id;
    request.workload_key = "recovery";
    request.idempotency_key = "recovery-1";
    request.reservation_ttl = std::chrono::milliseconds{1};
    request.estimate = {{ResourceDimension::ConcurrencySlots, 1.0}};

    const auto admitted = governor.admit(request);
    assert(admitted.allowed && admitted.reservation);

    ResourceRecoveryManager recovery{repository};
    const auto report = recovery.recover(Clock::now() + std::chrono::seconds{1});
    assert(report.expired_released == 1);

    const auto restored = repository.load_account(account_id);
    assert(restored);
    assert(restored->limits.front().reserved == 0.0);
    return 0;
}
