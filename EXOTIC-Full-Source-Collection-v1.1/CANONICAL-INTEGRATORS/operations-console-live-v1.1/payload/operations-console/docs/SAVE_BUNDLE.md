# EXOTIC Save Bundle — Operations Console v1.0

**Bundle ID:** `EXOTIC-OPERATIONS-CONSOLE-1.0`

## Locked product decision

EXOTIC has one unified professional Operations Console rather than a separate demo frontend for each backend subsystem.

## Surfaces

- Overview
- Objectives
- Proposals
- Approvals
- Scheduler
- Agents
- Resources
- Operations
- Audit Timeline
- Traces
- Alerts
- System Health
- Emergency Controls
- Settings

## Runtime modes

- Demo: fully local data and interactive simulation.
- Mock Live: included HTTP adapter simulation.
- Live: connects to the C++ runtime API adapter.

## Visual canon

- Clean white workspace
- Thick black structural borders
- Sharp geometric layouts
- Solid Flamingo Pink, Baby Yellow, and Light Sky Blue accents
- Green success, orange warning, red error
- No gradients
- Familiar professional navigation
- ER application identity
- Responsive desktop and mobile layouts

## Trust invariants

- Visual approval does not replace current server-side authority validation.
- Emergency controls require server-side enforcement.
- The browser never grants permissions.
- The console may display cached state, but mutating actions must be confirmed by the runtime.
- Simulation is visually and operationally distinct from production.

## Next dependency

A thin authenticated C++ HTTP/WebSocket adapter that maps runtime repositories, dashboards, metrics, audit evidence, and control actions to the console contract.
