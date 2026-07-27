# EXOTIC Strict Overnight Build Plan

Date started: July 26, 2026

## Objective

Run EXOTIC through a strict overnight execution sequence that leaves visible evidence, workspace artifacts, and measurable progress by morning.

This overnight plan is a constrained execution slice of the standing [AUTO_MODE_MASTER_PLAN.md](C:/Projects/Exotic/docs/AUTO_MODE_MASTER_PLAN.md).

## Rules

- Only one dependency layer should advance past its verification barrier at a time. Multiple independent cells inside that layer may run concurrently.
- A cell is not considered complete until the bridge runtime has an evidence-backed completion update and records updated workspace state.
- Auto mode may advance scaffolded work overnight, but any high-risk business or launch decision remains approval-gated.
- The overnight run is for disciplined workspace construction, not uncontrolled deployment.

## Strict step sequence

1. Stabilize the monorepo build baseline. Expected time: 45-90 min.
2. Lock the canonical venture model. Expected time: 60-120 min.
3. Lock the shared workspace shell. Expected time: 90-180 min.
4. Generate the first venture workspace from the broad request. Expected time: 45-75 min.
5. Initialize the Ideas studio workspace. Expected time: 25-40 min.
6. Initialize the Business studio workspace. Expected time: 35-60 min.
7. Initialize the Product studio workspace. Expected time: 35-60 min.
8. Initialize the Design studio workspace. Expected time: 30-50 min.
9. Initialize the Website studio workspace. Expected time: 30-50 min.
10. Initialize the Development studio workspace. Expected time: 45-90 min.
11. Initialize the Marketing studio workspace. Expected time: 30-55 min.
12. Initialize the Research studio workspace. Expected time: 30-55 min.
13. Initialize the Workflows studio workspace. Expected time: 40-70 min.
14. Initialize the Operations studio workspace. Expected time: 30-50 min.
15. Update evidence, metrics, and current-state reporting. Expected time: 25-45 min.
16. Prepare the morning review summary for operator inspection. Expected time: 20-35 min.

## Production Fabric grouping

The numbered roadmap remains the audit trail. Auto mode may execute ready items in these bounded waves:

1. Serial foundation: steps 1-4.
2. Discovery swarm: steps 5 and 12 in parallel.
3. Strategy cell: step 6.
4. Product cell: step 7.
5. Production swarm: steps 8, 10, 11, and 13 in parallel.
6. Assembly cell: step 9.
7. Operations cell: step 14.
8. Serial evidence and handoff: steps 15-16.

Every wave has a verification barrier. Failure, missing evidence, or an unsatisfied approval blocks dependent waves without stopping unrelated cells in the current wave.

## Expected morning outputs

- Updated roadmap progression
- Venture workspace JSON
- Studio workspace files
- Evidence log
- Current-state snapshot
- Build plan still intact for next cycle

## Known limitation

This overnight mode now has a real dependency planner, bounded executor, and bridge-visible production cells. It still needs a real Codex worker/receipt adapter before it can claim full studio-quality autonomous production in every domain.
