# Compatibility Notes

## Expected existing targets

```text
exotic_autonomy     v0.1/v0.2
exotic_scheduler    v0.3
exotic_governance   v0.4
exotic_resources    v0.5
```

## Scheduler boundary

`AgentOrchestratedExecutionBridge` becomes the scheduler's execution bridge. It
contains dynamic selected-agent governance checks and aggregate resource
admission. Do not also wrap it in `GovernedResourceExecutionBridge`.

## Governance

`GovernanceAgentCompatibility` requires both `AuthorityGate` and
`GovernanceRepository`. The repository is needed to revalidate durable approval
requests when the authority evaluator returns `approval_required`.

## Resources

`ResourceBudgetCompatibility` uses `ResourceGovernor::preview` while scoring.
The final bridge then calls `ResourceGovernor::admit` once for the aggregate
selected team. Preview does not reserve capacity.

## Database

The default database may remain:

```text
<workspace>/.exotic/state/autonomy.db
```

The agent tables use their own `agent_schema_metadata` namespace and reject a
schema version newer than 6.

## Existing v0.4 patch

The v0.5 bundle includes a replacement `patches/v0.4/sha256.cpp` that adds the
missing integer header required by some compilers. Keep that patch applied.

## Existing v0.3 warning

The supplied v0.3 `scheduler/types.cpp` places several conditionals on shared
lines. GCC reports `-Wmisleading-indentation`; this is inherited code and does
not affect v0.6 behavior. v0.6 translation units pass the warning set with
`-Werror`.
