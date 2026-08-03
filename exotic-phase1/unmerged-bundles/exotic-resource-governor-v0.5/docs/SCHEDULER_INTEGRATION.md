# Scheduler Integration

The v0.5 bridge replaces the direct v0.4 scheduler bridge.

## Required order

```text
DurableScheduler
  -> GovernedResourceExecutionBridge
       1. Governance authority revalidation
       2. Approved-budget validation
       3. Hierarchical resource admission
       4. Atomic reservation
       5. AutonomyExecutionBridge
       6. Usage measurement
       7. Reconciliation and release
       8. Anomaly and circuit update
```

Do not wrap `GovernedExecutionBridge` around `GovernedResourceExecutionBridge`.
The v0.5 bridge already performs the v0.4 authority check and then inserts
resource admission at the exact required position.

## Example

```cpp
using namespace exotic::autonomy;
using namespace exotic::autonomy::scheduler;
using namespace exotic::autonomy::governance;
using namespace exotic::autonomy::resources;

SqliteResourceRepository resource_repository{database_path};
GovernanceBudgetApprovalVerifier budget_approvals{governance_repository};
ResourceGovernor resource_governor{resource_repository, budget_approvals};

ResourceRecoveryManager resource_recovery{resource_repository};
resource_recovery.recover();

Subject worker{
    "exotic.worker.1",
    {"operator"},
    {{"environment", "production"}}
};

GovernanceSchedulerAuthorityValidator authority{
    authority_gate,
    governance_repository,
    worker
};

FixedJobResourcePlanner planner{
    task_account_id,
    {
        {ResourceDimension::MoneyUsd, 0.25},
        {ResourceDimension::ApiCredits, 20.0},
        {ResourceDimension::CpuMilliseconds, 2000.0},
        {ResourceDimension::MemoryBytes, 256.0 * 1024.0 * 1024.0},
        {ResourceDimension::ConcurrencySlots, 1.0}
    }
};

EstimatedUsageMeter meter;
AutonomyExecutionBridge autonomy_execution{kernel, worker.id};

GovernedResourceExecutionBridge execution{
    authority,
    resource_governor,
    planner,
    meter,
    autonomy_execution
};

DurableScheduler scheduler{
    scheduler_repository,
    execution,
    conditions,
    limits
};
```

`FixedJobResourcePlanner` is for initial integration and testing. Production
jobs should use a domain-specific `JobResourcePlanner` that reads trusted job
metadata and returns the correct leaf account, estimate, workload key,
idempotency key, reservation TTL, and governance approval ID.
