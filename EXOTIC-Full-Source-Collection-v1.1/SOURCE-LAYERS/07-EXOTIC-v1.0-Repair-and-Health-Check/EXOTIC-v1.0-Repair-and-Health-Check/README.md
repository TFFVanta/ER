# EXOTIC v1.0 Repair and Health Check

This package reviews the latest local integration report, verifies the v1.0 files, repairs safe build wiring, rebuilds with MSVC, runs CTest, executes the complete simulation, validates durable records and dashboards, and optionally repairs the Windows service.

It does not overwrite unrelated source files. The only automatic source-tree edit is adding the guarded v1.0 CMake include block when that block is missing; the previous root `CMakeLists.txt` is backed up first.

## Normal repair

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Repair-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg
```

## Repair and verify the Windows service

Open PowerShell as Administrator:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Repair-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg -InstallOrRepairService
```

## Clean stale CMake configuration

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Repair-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg -CleanConfigure
```

The old build directory is renamed rather than deleted.

## Output

The final report is written to:

```text
C:\Projects\Exotic\.exotic\reports\v1-repair-<timestamp>.txt
```

Detailed configure, build, test, simulation, dashboard, and service logs are written beneath:

```text
C:\Projects\Exotic\.exotic\reports\repair-<timestamp>\
```

## Diagnostics-only package

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Collect-EXOTIC-v1-Diagnostics.ps1 -Workspace C:\Projects\Exotic
```
