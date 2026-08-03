# v0.6 Integration

## Required target order

```cmake
include(cmake/EXOTIC_SCHEDULER.cmake)
include(cmake/EXOTIC_GOVERNANCE.cmake)
include(cmake/EXOTIC_RESOURCES.cmake)
include(cmake/EXOTIC_AGENTS.cmake)
```

## Runtime construction

```cpp
using namespace exotic::autonomy;
using namespace exotic::autonomy::agents;

SqliteAgentRepository agent_repository{
    workspace / ".exotic" / "state" / "autonomy.db"
};

AgentRegistry registry{agent_repository};
GovernanceAgentCompatibility governance_compatibility{
    authority_gate,
    governance_repository
};
ResourceBudgetCompatibility resource_compatibility{
    resource_governor
};
CandidateScorer scorer{
    agent_repository,
    registry,
    governance_compatibility,
    resource_compatibility
};
WorkAllocator allocator{agent_repository, scorer};
AgentLearningEngine learning{agent_repository};
AgentRecoveryManager recovery{agent_repository, allocator};
recovery.recover();

CallbackTaskRequirementPlanner requirements{
    [&](const scheduler::Job& job) {
        TaskRequirement value;
        value.job_id = job.id;
        value.proposal_id = job.proposal_id;
        value.action = "proposal.execute";
        value.domain = "software";
        value.capabilities = {
            {"software.cpp", 0.80, 0.80, true, 1.0}
        };
        value.tools = {
            {"compiler", "build", "workspace", true}
        };
        value.minimum_trust = TrustLevel::Standard;
        value.resource_account_id = task_resource_account_id;
        value.governance_approval_id = approval_id;
        value.maximum_team_cost_usd = 10.0;
        value.estimated_duration_hours = 0.25;
        value.resource_estimate = {
            {resources::ResourceDimension::ConcurrencySlots, 1.0},
            {resources::ResourceDimension::MemoryBytes, 512.0 * 1024.0 * 1024.0}
        };
        return value;
    }
};

resources::EstimatedUsageMeter usage_meter;

AgentOrchestratedExecutionBridge agent_execution{
    agent_repository,
    registry,
    allocator,
    governance_compatibility,
    resource_compatibility,
    resource_governor,
    usage_meter,
    learning,
    requirements,
    autonomy_execution_bridge
};

scheduler::DurableScheduler scheduler{
    scheduler_repository,
    agent_execution,
    condition_evaluator,
    scheduler_limits
};
```

## Important replacement

Use:

```text
DurableScheduler
  -> AgentOrchestratedExecutionBridge
  -> AutonomyExecutionBridge
```

Do not wrap `AgentOrchestratedExecutionBridge` inside the older
`GovernedResourceExecutionBridge`. v0.6 performs selected-agent authority
revalidation and aggregate resource admission internally. Wrapping both would
reserve and reconcile the same work twice.

## Current assignment access

An inner executor can inspect the selected team during execution:

```cpp
const auto* assignment = agents::current_assignment();
if (assignment != nullptr) {
    for (const auto agent_id : assignment->plan.agent_ids) {
        // Dispatch stage work to the selected runtime identity.
    }
}
```
