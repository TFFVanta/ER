# EXOTIC Resource Governor and Budget Runtime v0.5

This bundle adds durable, hierarchical resource governance to the EXOTIC
Autonomy stack.

## Dependencies

- EXOTIC Autonomy Persistence v0.2 (`exotic_autonomy`)
- EXOTIC Event Scheduler v0.3 (`exotic_scheduler`)
- EXOTIC Governance Runtime v0.4 (`exotic_governance`)
- SQLite3
- C++20

## Production file tree

```text
src/exotic/autonomy/resources/
├── types.hpp
├── types.cpp
├── repository.hpp
├── in_memory_repository.hpp
├── in_memory_repository.cpp
├── sqlite_repository.hpp
├── sqlite_repository.cpp
├── approval.hpp
├── governance_approval.hpp
├── governance_approval.cpp
├── forecast.hpp
├── forecast.cpp
├── anomaly.hpp
├── anomaly.cpp
├── circuit_breaker.hpp
├── circuit_breaker.cpp
├── governor.hpp
├── governor.cpp
├── recovery.hpp
├── recovery.cpp
├── scheduler_bridge.hpp
├── scheduler_bridge.cpp
├── cli.hpp
└── cli.cpp

tests/autonomy/
├── resource_vector_tests.cpp
├── resource_governor_tests.cpp
├── resource_recovery_tests.cpp
├── resource_bridge_tests.cpp
└── sqlite_resource_tests.cpp

cmake/EXOTIC_RESOURCES.cmake
docs/MIGRATION_V5.sql
docs/SCHEDULER_INTEGRATION.md
docs/COMPATIBILITY_NOTES.md
docs/SAVE_BUNDLE.md
patches/v0.4/sha256.cpp
```

## What is implemented

- Durable resource accounts
- Workspace → project → agent → task budget hierarchy
- Atomic reservations across every parent account
- Monetary and API-credit budgets
- CPU, GPU, memory, storage, network, and concurrency quotas
- Durable token-bucket rate limits
- Resource reservation heartbeats and expiration
- Reconciliation after success, failure, timeout, and cancellation
- Actual execution usage reports
- Historical mean and p95 forecasting
- Estimate-versus-actual anomaly detection
- Persistent circuit breakers
- Authority-linked budget approvals
- Resource emergency stop
- Restart recovery for expired reservations
- Scheduler admission bridge
- Idempotent reservation creation
- Append-only resource ledger events
- CLI and CTest targets

## Merge instructions

Copy the bundle's `src`, `tests`, `cmake`, `docs`, and optional `patches`
folders into the EXOTIC repository.

Add this after the v0.2, v0.3, and v0.4 CMake includes:

```cmake
include(cmake/EXOTIC_RESOURCES.cmake)
```

If the v0.4 fallback hash file fails to compile, apply:

```powershell
Copy-Item -Force `
  patches\v0.4\sha256.cpp `
  src\exotic\autonomy\governance\sha256.cpp
```

Then build and test:

```powershell
cmake -S . -B out\build\x64-Debug
cmake --build out\build\x64-Debug --config Debug
ctest --test-dir out\build\x64-Debug -C Debug --output-on-failure
```

## Database

Use the same EXOTIC workspace database used by autonomy, scheduler, and
governance:

```text
<workspace>/.exotic/state/autonomy.db
```

The resource runtime maintains its own schema version in
`resource_schema_metadata`, preventing conflicts with older migration schemes.

## CLI integration

Route these commands to `run_resource_cli`:

```text
exotic resources status
exotic resources accounts
exotic resources reservations
exotic resources anomalies
exotic resources circuits
exotic resources forecast <workload-key>
exotic resources recover
exotic resources stop
exotic resources resume
```

## Required scheduler integration

Use `GovernedResourceExecutionBridge` directly as the scheduler execution
bridge. It performs authority revalidation first, then resource admission,
then delegates to the existing `AutonomyExecutionBridge`.

```text
DurableScheduler
  -> GovernedResourceExecutionBridge
      -> AuthorityGate
      -> ResourceGovernor
      -> AutonomyExecutionBridge
```

See `docs/SCHEDULER_INTEGRATION.md` for code.

## Operational rule

A reservation is not proof that an operation succeeded. It is only permission
to consume bounded resources. Completion still requires the existing Autonomy
operation and verification path.
