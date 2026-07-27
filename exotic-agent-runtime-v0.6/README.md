# EXOTIC Agent Capability Registry and Work Allocation Runtime v0.6

This bundle adds durable agent identity, capability intelligence, dynamic work
allocation, team formation, liveness, replacement, and learning to the EXOTIC
autonomy stack.

## Execution chain

```text
Objective
  -> Proposal
  -> Governance planning
  -> Agent requirement planning
  -> Constraint filtering
  -> Candidate scoring
  -> Team and supervisor formation
  -> Selected-agent authority revalidation
  -> Aggregate resource reservation
  -> Scheduler execution
  -> Verification
  -> Resource reconciliation
  -> Performance learning
```

## Major capabilities

- Durable agent identities and revocation
- Specialist profiles and domain scope
- Hierarchical capability taxonomy
- Proficiency and reliability scores
- Tool permissions with operations, scope, and expiry
- Runtime and model metadata
- Availability, health, workload, and cost profiles
- Trust requirements
- Capability evidence
- Constraint-based routing
- Weighted load balancing
- Single, parallel, sequential, and supervisor-worker plans
- Durable assignments and assignment versions
- Worker binding and heartbeat leases
- Failure replacement without continuity loss
- Performance history and controlled learning updates
- Governance compatibility
- Resource-budget compatibility
- Scheduler execution integration
- SQLite migration and restart recovery
- CLI and CTest integration

## Files

```text
src/exotic/autonomy/agents/
  types.*
  repository.hpp
  in_memory_repository.*
  sqlite_repository.*
  taxonomy.*
  registry.*
  compatibility.*
  scoring.*
  router.*
  learning.*
  recovery.*
  execution_context.*
  scheduler_bridge.*
  cli.*
```

## Build

Copy `src`, `tests`, `docs`, and `cmake` into the EXOTIC repository. Then add:

```cmake
include(cmake/EXOTIC_AGENTS.cmake)
```

Configure, build, and test:

```powershell
cmake -S . -B out\build\x64-Debug
cmake --build out\build\x64-Debug --config Debug
ctest --test-dir out\build\x64-Debug -C Debug --output-on-failure
```

Read `docs/INTEGRATION.md` before replacing the current scheduler execution
bridge.
