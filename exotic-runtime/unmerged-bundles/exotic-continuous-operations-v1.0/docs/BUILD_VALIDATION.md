# Build validation

Validated on July 14, 2026 in an isolated CMake harness using:

- Real v0.3 Scheduler source
- Real v0.4 Governance source
- Real v0.5 Resource Governor source
- Real v0.6 Agent Runtime source
- The v0.2 SQLite database and transaction wrapper
- Contract-compatible v0.1/v0.2 application-layer stubs where the live source tree was unavailable

## Compiled

- Continuous Operations runtime library
- Concrete full-stack bootstrap translation unit
- Standalone durable-control CLI
- Scheduler, governance, resources, agents, telemetry, lifecycle, emergency controls, dashboards, and Windows service runner
- GNU C++20 with `-Werror -Wall -Wextra -Wpedantic`

## Tests passed

1. Service dependency graph and cycle rejection
2. Recovery/start/rollback/reverse shutdown lifecycle
3. Workspace ownership lock
4. SQLite audit, metrics, traces, alerts, and durable controls
5. Failure injection
6. Durable scheduler integration
7. Scheduler → agent allocation → governance → resource reservation → execution → learning integration
8. 100-job, four-worker concurrency soak
9. Governance capability-scope enforcement

Result:

```text
100% tests passed, 0 tests failed out of 9
```

The standalone CLI also opened a fresh workspace database and returned a valid v1.0 status response.

## Defects discovered and corrected during validation

- Concurrent workers could overlap transactions on one SQLite connection. The v0.2 patch now serializes statement and transaction ownership at the connection layer.
- A worker could execute a stale in-memory job after another worker had completed and released it. The v0.3 patch persists terminal state before lease release and reloads the job after lease acquisition.
- Governance capability matching did not fully enforce grant scope. The v0.4 patch now checks wildcard, exact ID, and `type:id` scopes.
- `MAX(id)+1` allocation was unsafe under concurrent workers. Durable atomic sequences are now used by patched repositories.

## Remaining release work

The short soak is a build gate, not final release certification. Production release still requires:

- Live Windows/MSVC build against the actual v0.1/v0.2 repository
- Root CLI dispatcher integration
- Windows service install/start/stop/uninstall verification
- Simulation-mode end-to-end operation with durable evidence
- The 24-hour soak defined in `DEFINITION_OF_DONE.md`
