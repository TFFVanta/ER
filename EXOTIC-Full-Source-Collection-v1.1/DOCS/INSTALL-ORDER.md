# EXOTIC Installation and Source Order

## Backend

The authoritative backend installer is:

```text
CANONICAL-INTEGRATORS/backend-live-integrator-v1.0/Install-EXOTIC-v1.ps1
```

It supplies the v0.2 foundation, applies v0.3 through v1.0, patches compatibility issues, configures CMake, builds, tests, and runs the simulation verifier.

## Repair

Use:

```text
CANONICAL-INTEGRATORS/repair-health-v1.0/Repair-EXOTIC-v1.ps1
```

after integration when MSVC, CMake, CTest, SQLite, dashboard, or Windows service health needs revalidation.

## Frontend

The authoritative frontend installer is:

```text
CANONICAL-INTEGRATORS/operations-console-live-v1.1/Integrate-EXOTIC-Console.ps1
```

It installs the browser/Electron console, C++ local API adapter, live controls, page verification, and Windows packaging.

## Source archive policy

`SOURCE-LAYERS/` is a historical and development archive. It intentionally preserves versions separately. The live repository should be changed only through an integrator or a reviewed manual merge.
