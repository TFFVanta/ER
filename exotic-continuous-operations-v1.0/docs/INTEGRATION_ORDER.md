# Exact merge order

1. Merge Autonomy Kernel v0.1 and Persistence v0.2.
2. Merge Scheduler v0.3.
3. Merge Governance v0.4.
4. Merge Resources v0.5.
5. Merge Agents v0.6.
6. Copy this bundle's `src`, `tests`, `cmake`, `apps`, `scripts`, and `docs` into the repository.
7. Apply every compatibility file under `patches/v0.2` through `patches/v0.6`, preferably with:

```powershell
.\scripts\apply-compatibility-patches.ps1 -Workspace C:\Projects\Exotic
```

8. Perform the v0.2 Autonomy repository sequence update described in `COMPATIBILITY_PATCHES.md` because the live repository implementation was not available to patch safely.
9. Include all CMake modules in version order, ending with `EXOTIC_CONTINUOUS_OPERATIONS.cmake`.
10. Build once with `EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=OFF`; run all tests.
11. Build again with `EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON` and `EXOTIC_RUNTIME_BUILD_CLI=ON`.
12. Enable `EXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON`, install the service, and verify STOP/SHUTDOWN behavior.
13. Run simulation mode end to end before granting production authority.

## Single execution bridge

The v1.0 runtime does not wrap the v0.6 bridge with the older v0.4 or v0.5 scheduler bridges.

```text
DurableScheduler
→ AgentOrchestratedExecutionBridge
→ AutonomyExecutionBridge
```

`AgentOrchestratedExecutionBridge` is the only scheduler execution bridge because it already performs dynamic assignment, selected-agent governance validation, aggregate resource reservation, execution, reconciliation, and learning. Additional wrappers would duplicate authority checks or reserve the same resources twice.
