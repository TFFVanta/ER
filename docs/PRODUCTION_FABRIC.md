# EXOTIC Production Fabric

Effective date: July 26, 2026

## Outcome

EXOTIC can organize a venture build as a dependency-aware production fabric instead of a single serial queue.

The hierarchy is:

1. One governed venture or roadmap initiative.
2. Dependency layers that establish safe execution order.
3. Specialized swarms grouped by studio or production lane.
4. Bounded worker cells that produce evidence-backed receipts.
5. A verification barrier before dependent layers can start.

This preserves the existing rule that progress must be real and evidenced while allowing independent work to happen concurrently.

## Operating model

```text
Initiative
  Layer 1: discovery
    Ideas swarm       -> producer cells
    Research swarm    -> producer cells
  Verification barrier
  Layer 2: strategy
    Business swarm    -> producer cells
  Verification barrier
  Layer 3: definition
    Product swarm     -> producer cells
  Verification barrier
  Layer 4: production
    Design swarm      -> producer cells
    Development swarm -> producer cells
    Marketing swarm   -> producer cells
    Workflows swarm   -> producer cells
  Verification barrier
  Layer 5: assembly
    Website swarm     -> producer cells
  Verification barrier
  Layer 6: operations
    Operations swarm  -> producer cells
```

The default concurrency ceiling is four cells. `EXOTIC_SWARM_CONCURRENCY` can set a bridge ceiling from 1 to 16. The reusable workflow package accepts a per-plan `maxConcurrency` value.

## Implemented contracts

`@exotic/workflow` now provides:

- `planProductionFabric` for deterministic validation, cycle detection, dependency layering, swarm grouping, replicas, approval gates, and capacity metrics.
- `executeProductionFabric` for bounded asynchronous execution, retries, evidence-bearing receipts, optional candidate verification, and downstream blocking after failed verification.
- `createWorkspaceProductionFabric` for projecting a canonical venture workspace task graph into a production plan.

Generated venture workspaces now contain task graph edges for:

- task `implements` studio scope
- task `produces` artifact
- task `depends-on` prerequisite task

The Codex bridge projects roadmap dependencies into `bridge.productionFabric` and active work into `bridge.executionFabric`. Auto mode can activate more than one ready roadmap cell, up to the configured ceiling, but it still cannot change completion percentages without a verified update.

## Safety and quality rules

- Dependencies are validated before scheduling; unknown dependencies and cycles are rejected or surfaced as blocked.
- Approval-required jobs and their dependents remain outside the executable layers until approval is supplied.
- Every successful worker must return at least one evidence reference.
- A failed or evidence-free job prevents dependent jobs from running.
- Replicas are alternatives for important work, not permission to create conflicting writes.
- The executor never interprets timer activity as completion.
- Public launch, material spending, authority changes, and irreversible actions remain operator-gated.

## Throughput effect

The ten studio sequence is reduced from ten serial initialization slots to six dependency layers. The widest production layer can run Design, Development, Marketing, and Workflows together. Actual wall-clock improvement depends on worker adapters, task size, shared-file contention, and verification time; the planner reports structure and critical-path metrics rather than claiming unmeasured speed.

## Next integration

The bridge now emits parallel execution cells, and the workflow package can execute supplied worker functions. The next maturity step is to connect real Codex automation receipts to those cells so the bridge can ingest verified completion automatically. Until that adapter exists, external agent dispatch remains an integration boundary rather than a claimed autonomous capability.
