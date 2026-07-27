# EXOTIC Operations Console — Live Integration v1.1

This package safely installs the EXOTIC Operations Console into an existing `C:\Projects\Exotic` runtime, compiles its native local API with MSVC, verifies the real SQLite-backed runtime surfaces, builds the Electron desktop executable, and launches the console in Live mode.

It does **not** replace the runtime bundles or rewrite unrelated source files. New integration files use dedicated paths, collisions are backed up, and the root `CMakeLists.txt` receives one clearly marked include block.

## One-line integration

Open PowerShell inside this extracted package and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Integrate-EXOTIC-Console.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg -CleanConfigure
```

This performs:

1. Source-tree and prerequisite inspection.
2. Versioned installation to `console\operations-v1.1`.
3. Collision backups and rollback manifest creation.
4. CMake integration using a marked, replaceable block.
5. SQLite/vcpkg setup when requested.
6. MSVC compilation of the runtime, tests, smoke executable, and `exotic-console-api.exe`.
7. Full CTest execution.
8. Electron dependency repair and frontend validation.
9. Real simulation through the native API.
10. Live verification of all fourteen console surfaces.
11. Emergency-control activation and cleanup verification.
12. Windows NSIS and portable executable packaging.
13. Live desktop launch.

## Outputs

```text
C:\Projects\Exotic\console\operations-v1.1\
C:\Projects\Exotic\console\operations-v1.1\native\exotic-console-api.exe
C:\Projects\Exotic\console\operations-v1.1\native\exotic-runtime-smoke.exe
C:\Projects\Exotic\console\operations-v1.1\release\
C:\Projects\Exotic\.exotic\reports\console-v1.1-<timestamp>\
C:\Projects\Exotic\.exotic\integration-backups\console-v1.1-<timestamp>\
```

## Launch after installation

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Launch-EXOTIC-Console.ps1 -Workspace C:\Projects\Exotic
```

## Verify again

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Verify-EXOTIC-Console.ps1 -Workspace C:\Projects\Exotic
```

The verifier starts the local API on port `8791`, runs the real simulation smoke executable, verifies emergency controls, and checks Overview, Objectives, Proposals, Approvals, Scheduler, Agents, Resources, Operations, Audit, Traces, Alerts, Health, Emergency Controls, and Settings.

## Safe rollback

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Rollback-EXOTIC-Console.ps1 -Workspace C:\Projects\Exotic
```

Rollback restores or removes only files whose hashes still match the installed package. Files edited after installation are left untouched and reported as warnings.

## Runtime API

The native adapter listens only on loopback:

```text
http://127.0.0.1:8787
```

Routes:

```text
GET  /api/v1/health
GET  /api/v1/console/snapshot
POST /api/v1/actions/approval.approve
POST /api/v1/actions/approval.reject
POST /api/v1/actions/alert.acknowledge
POST /api/v1/actions/emergency.activate
POST /api/v1/actions/emergency.clear
POST /api/v1/actions/runtime.shutdown
POST /api/v1/actions/simulation.run
```

The adapter reads the shared `.exotic\state\continuous-operations.db`, discovers the actual durable workspace identity, uses the real governance and control services for mutations, and invokes the real runtime smoke executable for simulation.

## Prerequisites

- Windows 10 or 11 x64
- Visual Studio with **Desktop development with C++**
- CMake
- Node.js 22 or later
- npm
- Git only when `-BootstrapVcpkg` must clone vcpkg

The generated Windows packages are unsigned development builds. Windows may display a SmartScreen warning until a code-signing certificate is added.
