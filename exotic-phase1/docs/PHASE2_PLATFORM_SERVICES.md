# Exotic Phase 2 — Platform Services

Version 0.4 introduces one lifecycle contract for platform capabilities.

## Services

- `ServiceRegistry`: deterministic initialize/start/stop order and unified health.
- `SearchService`: bounded text search through approved workspace projects.
- `BuildService`: explicit allowlisted build profiles, queued jobs, captured logs, and completion events.
- `AutomationService`: named, observable workflows made from verified steps.
- `AIService`: proposal-first AI actions requiring approval before execution.
- `NotificationService`: in-process platform notifications.
- `DeviceService`: device enrollment, approval, and revocation.

## Security boundary

Phase 2 does not expose an arbitrary remote terminal. Builds must use registered profiles. Search and file reads remain contained by `PlatformService` workspace checks. AI actions enter the system as proposals rather than immediate side effects.

## Service contract

Every service implements:

- `name()`
- `initialize()`
- `start()`
- `stop()`
- `health()`

Health includes lifecycle state, status detail, and operation count.

## Verification

Run:

```powershell
.\out\build\x64-Debug\exotic.exe platform
```

This boots all Phase 2 services, enrolls and approves a demonstration device, creates an AI proposal, runs a workflow, sends a notification, prints health, and shuts down cleanly.

## Next integration

The next increment should connect these services to Portal API routes using capability-scoped device sessions, then add persistent journals for jobs, notifications, approvals, and audit history.
