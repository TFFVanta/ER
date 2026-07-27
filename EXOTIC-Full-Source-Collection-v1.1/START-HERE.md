# EXOTIC Full Source Collection v1.1

This collection preserves the complete EXOTIC runtime and console work produced through v1.1.

## What is inside

- Original immutable release archives in `RELEASES/`
- Fully expanded source for every release in `SOURCE-LAYERS/`
- Safe Windows integration tools in `CANONICAL-INTEGRATORS/`
- EXOTIC source bootstrap knowledge
- ER identity asset
- SHA-256 checksums and machine-readable manifests
- Scripts to save the collection into `C:\Projects\Exotic`, integrate the latest runtime, and verify archive integrity

## Safest first action

Save this complete collection into the EXOTIC repository without changing live source:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\TOOLS\SAVE-TO-SOURCE.ps1 -Workspace C:\Projects\Exotic
```

This creates:

```text
C:\Projects\Exotic\source-collection\EXOTIC-Full-Source-Collection-v1.1
```

## Integrate the latest backend and frontend

Run PowerShell as Administrator when Windows service installation is required:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\TOOLS\INTEGRATE-LATEST.ps1 -Workspace C:\Projects\Exotic -BootstrapVcpkg -CleanConfigure
```

The integrators create backups and stop on unknown merge conflicts rather than overwriting unrelated work.

## Verify the collection

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\TOOLS\VERIFY-COLLECTION.ps1
```

## Canonical deployment order

1. Autonomy and durable persistence baseline v0.2, supplied by the live integrator
2. Event Scheduler v0.3
3. Governance v0.4
4. Resource Governor v0.5
5. Agent Runtime v0.6
6. Continuous Operations v1.0
7. Repair and health verification
8. Operations Console v1.0
9. Live Console Integration v1.1

Do not manually flatten every layer over a live repository. Use the canonical integrators because they preserve local work and apply compatibility patches in the correct order.
