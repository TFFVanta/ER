# EXOTIC Save Bundle — Operations Console Live Integration v1.1

**Bundle ID:** `EXOTIC-OPERATIONS-CONSOLE-LIVE-1.1`

## Locked architecture

```text
EXOTIC Operations Console
  → loopback native API
  → durable runtime repositories and controls
  → Continuous Operations Runtime v1.0
```

## Locked decisions

- One unified console, not separate frontends per subsystem.
- Browser and Windows desktop share the same UI and API contract.
- Live mode reads the real continuous-operations database through C++.
- JavaScript does not write SQLite directly.
- Authority mutations use GovernanceService.
- Runtime emergency and shutdown mutations use ControlPlane.
- Every screen must work with demo data and live data.
- Live snapshots refresh every five seconds.
- The desktop wrapper starts the local API automatically.
- The API binds only to loopback.
- The adapter discovers the actual durable workspace ID.
- Installation is versioned and collision-backed-up.
- Rollback never destroys post-install local edits.

## Visual canon

- Clean white workspace
- Thick black structural borders
- Sharp geometric hierarchy
- Flamingo Pink, Baby Yellow, and Light Sky Blue accents
- No gradients
- ER logo as application identity
- Familiar professional navigation
- Responsive desktop and mobile behavior

## Definition of Done

- Native adapter compiles against the live EXOTIC runtime.
- All CTests pass under MSVC.
- Real simulation completes.
- Every durable record class is visible in the live snapshot.
- All fourteen console pages pass verification.
- Emergency activation and clear are verified.
- Electron desktop executable and installer are produced.
- Console launches in Live mode.
- Integration report ends with `result=PASS`.
