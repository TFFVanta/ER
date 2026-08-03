# EXOTIC Continuous Operations Runtime v1.0

This bundle integrates the Autonomy Kernel v0.1, durable persistence v0.2, scheduler v0.3, governance v0.4, resources v0.5, and agent allocation v0.6 into one lifecycle-managed 24/7 runtime.

## Production flow

```text
Workspace ownership lease
→ Recover services in dependency order
→ Start lifecycle-managed services
→ Health supervision and durable controls
→ Scheduler lease
→ Dynamic agent or team assignment
→ Current governance revalidation
→ Atomic hierarchical resource reservation
→ Autonomy Kernel execution
→ Verification
→ Resource reconciliation
→ Performance learning
→ Audit, trace, metrics, alerts, and dashboard
```

## Canonical service order

```text
Autonomy
→ Governance
→ Resources
→ Agents
→ Agent Heartbeat
→ Scheduler
→ Health Supervisor
```

Shutdown occurs in reverse order.

## Merge order

Read these first:

1. `docs/INTEGRATION_ORDER.md`
2. `docs/COMPATIBILITY_PATCHES.md`
3. `docs/CLI_INTEGRATION.md`
4. `docs/DEFINITION_OF_DONE.md`

Copy `src`, `tests`, `cmake`, `apps`, and `scripts` into the live repository and include:

```cmake
include(cmake/EXOTIC_SCHEDULER.cmake)
include(cmake/EXOTIC_GOVERNANCE.cmake)
include(cmake/EXOTIC_RESOURCES.cmake)
include(cmake/EXOTIC_AGENTS.cmake)
include(cmake/EXOTIC_CONTINUOUS_OPERATIONS.cmake)
```

## One-shot Windows build

From the extracted bundle:

```powershell
.\scripts\build-one-shot.cmd C:\Projects\Exotic
```

This applies the included compatibility files, ensures the SQLite vcpkg package is installed when vcpkg is available, builds Release, and runs CTest.

## Standalone runtime CLI

```powershell
.\out\build\x64-Release\Release\exotic-runtime-cli.exe --workspace C:\Projects\Exotic status
.\out\build\x64-Release\Release\exotic-runtime-cli.exe --workspace C:\Projects\Exotic audit
.\out\build\x64-Release\Release\exotic-runtime-cli.exe --workspace C:\Projects\Exotic alerts
.\out\build\x64-Release\Release\exotic-runtime-cli.exe --workspace C:\Projects\Exotic stop "maintenance"
.\out\build\x64-Release\Release\exotic-runtime-cli.exe --workspace C:\Projects\Exotic emergency-stop "operator intervention"
```

`docs/CLI_INTEGRATION.md` contains the exact dispatcher branch for exposing these as `exotic runtime ...` in the existing executable.

## Windows service

```powershell
.\scripts\install-service.ps1 -Workspace C:\Projects\Exotic
Start-Service EXOTIC
```

The Service Control Manager STOP and SHUTDOWN controls trigger cooperative cancellation, scheduler drain, reverse-order shutdown, and workspace-lock release.

## Validation boundary

The complete runtime, full bootstrap translation unit, standalone CLI, real v0.3-v0.6 sources, and v0.2 persistence wrapper were compiled with GNU C++20 and `-Werror -Wall -Wextra -Wpedantic`. Nine tests passed, including a 100-job/four-worker soak.

The actual v0.1/v0.2 repository was not available in the isolated build, so contract-compatible stubs were used for those missing application-layer types. Final MSVC validation must still occur inside the live EXOTIC tree. No claim is made that the bundle is release-certified before that build and the 24-hour soak gate pass.
