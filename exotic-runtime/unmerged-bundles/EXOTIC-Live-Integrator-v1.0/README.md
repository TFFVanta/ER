# EXOTIC Live Integrator v1.0

This package performs the Continuous Operations v1.0 integration on the Windows repository at `C:\Projects\Exotic`.

It is deliberately conservative:

- Existing files are never silently replaced.
- Known compatibility files use a three-way merge against their prior bundle version.
- Missing Autonomy v0.2 foundation files are supplied without replacing existing versions.
- Every modified pre-existing file is copied to a timestamped backup.
- Unknown conflicts stop before configuration or compilation.
- The simulation verifier fails unless all required durable records exist.

## What it performs

1. Captures Git status and a binary working-tree patch when Git is available.
2. Fills any missing Autonomy Kernel and Persistence v0.2 foundation files.
3. Merges Scheduler v0.3, Governance v0.4, Resources v0.5, Agents v0.6, and Continuous Operations v1.0.
4. Serializes SQLite transaction ownership across scheduler workers.
5. Replaces `MAX(id)+1` allocation with atomic durable sequences.
6. Reconciles every sequence with the table’s real `MAX(id)+1`, repairing legacy or stale sequence state.
7. Removes cached IDs from the Autonomy Kernel so every ID is allocated durably at the moment it is used.
8. Applies stale scheduler-job revalidation, lease ordering, authority scope enforcement, and durable IDs to v0.3-v0.6.
9. Adds `exotic runtime ...` interception to the existing `exotic.exe` dispatcher.
10. Adds guarded CMake modules without duplicating targets already present.
11. Installs SQLite through vcpkg, configures MSVC x64 Release, builds, and runs CTest.
12. Runs a fresh isolated simulation through Objective → Proposal → two-signature Approval → Agent Assignment → Governance → Resource Reservation → Operation → Verification.
13. Fails unless approval evidence, assignment, reservation, usage, operation, verification, audit, trace, metrics, and dashboard records are durable.

## Run the integration

Extract the ZIP, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg
```

Or double-click `RUN-INTEGRATION.cmd`.

The integrator stops before building when a local edit cannot be merged safely. Review:

```text
C:\Projects\Exotic\.exotic\reports\v1-integration-conflicts-<timestamp>.txt
```

Backups are written to:

```text
C:\Projects\Exotic\.exotic\integration-backups\v1.0-<timestamp>
```

Each isolated simulation is written under:

```text
C:\Projects\Exotic\.exotic\simulation-v1\<timestamp>
```

Its verification report is:

```text
.exotic\reports\v1-simulation-verification.txt
```

Its dashboards are:

```text
.exotic\dashboards\runtime-status.json
.exotic\dashboards\runtime-status.txt
```

## Exact commands after a successful integration

Run EXOTIC in the foreground:

```powershell
& 'C:\Projects\Exotic\out\build\x64-Release\Release\exotic-runtime-service.exe' --workspace 'C:\Projects\Exotic'
```

Inspect the runtime through the main EXOTIC executable:

```powershell
$env:EXOTIC_WORKSPACE='C:\Projects\Exotic'; & 'C:\Projects\Exotic\out\build\x64-Release\Release\exotic.exe' runtime status
```

Install the Windows service:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Projects\Exotic\scripts\install-service.ps1' -Workspace 'C:\Projects\Exotic'
```

Start the installed service:

```powershell
Start-Service EXOTIC
```

## Rollback

```powershell
powershell -ExecutionPolicy Bypass -File .\Rollback-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic
```

Rollback restores every pre-existing file touched by the integration. It intentionally does not delete newly added subsystem files automatically.

## Validation performed before packaging

The reconstructed Autonomy v0.2 foundation, real v0.3-v0.6 sources, v1.0 runtime, and live-integration overlay were compiled together in a C++20 compatibility harness.

- 30 of 30 CTest targets passed.
- The four-worker scheduler soak passed.
- The full Objective → Verification smoke executable passed.
- Durable approval, evidence, assignment, reservation, usage, operation, verification, both audit streams, trace, metrics, and dashboards were verified.
- A restart regression test verified that a second Autonomy Kernel cannot reuse audit IDs.
- A legacy-sequence regression test verified automatic repair when sequence state falls behind existing table rows.

The final MSVC build and modification of the real `C:\Projects\Exotic` tree can only happen when this integrator runs on the user’s Windows machine. The package does not claim that the live repository was modified from this isolated environment.
