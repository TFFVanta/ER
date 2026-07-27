# Live Runtime Adapter

## Boundary

The console never opens SQLite directly from JavaScript. Electron loads a loopback-only C++ HTTP adapter that links against the Continuous Operations, Governance, and SQLite runtime targets.

```text
Electron UI
  → 127.0.0.1 local API
  → EXOTIC repositories and control services
  → continuous-operations.db
```

## Read model

`GET /api/v1/console/snapshot` builds one coherent read model from durable runtime tables:

- objectives and objective metrics
- proposals and proposal steps
- governance requests and decisions
- scheduler jobs
- agents, capabilities, evidence, and assignments
- resource accounts, limits, reservations, usage, circuits, and anomalies
- operations and verification
- runtime audit, traces, metrics, alerts, controls, and service health

The adapter first uses `runtime.workspace_id` from `.exotic/runtime.conf` when that identity has durable records. For isolated simulations that deliberately override the identity, it selects the most recently active durable workspace identity. This prevents the dashboard from silently showing fallback service data.

## Write controls

Approval actions call `GovernanceService::decide`. Emergency and shutdown actions call the runtime `ControlPlane`. Alert acknowledgement updates only the alert belonging to the active workspace. Simulation invokes `exotic-runtime-smoke` and returns failure unless the executable reports success.

## Security

- Socket binds to `127.0.0.1`, not all interfaces.
- Electron uses `contextIsolation`, sandboxing, and no Node integration.
- External links open outside the application.
- API actions require explicit POST requests.
- The adapter does not grant authority; governance remains authoritative.
- The UI cannot bypass resource, agent, scheduler, or Autonomy verification gates.
