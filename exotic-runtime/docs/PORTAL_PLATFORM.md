# Exotic Portal Platform v0.3

Portal is the mobile/web command surface for the local Exotic Runtime.

## Implemented

- Token-authenticated LAN pairing
- Installable Progressive Web App
- Runtime health and intelligence-loop control
- Workspace project discovery
- Sandboxed directory and text-file browsing
- Project-type detection for CMake, Node, Flutter, Rust, and Python
- In-memory audit stream for security, runtime, project, and file events
- Strict workspace path containment
- Text-only file allowlist and 256 KiB read ceiling
- No arbitrary remote shell execution

## Service boundaries

- `Runtime`: graph, engines, security, memory, events
- `PlatformService`: workspace discovery, safe file access, audit history
- `PortalServer`: authentication, HTTP API, embedded client application
- `Portal PWA`: mobile presentation and commands

## API

All `/api/*` calls require the generated pairing token.

- `GET /api/status`
- `GET /api/projects`
- `GET /api/files?project=<id>&path=<relative>`
- `GET /api/file?project=<id>&path=<relative>`
- `GET /api/activity`
- `POST /api/reindex`
- `POST /api/demo`

## Security model

Portal binds to the local network only when explicitly started with remote access enabled. A new 192-bit token is generated per process. File requests are resolved under a configured workspace root and rejected when canonical resolution escapes that root. Shell commands are intentionally unavailable.

## Next platform layers

1. Persistent SQLite state and device registry
2. Public-key QR pairing and revocable device identities
3. Background job manager with allowlisted build/test profiles
4. Server-sent events or WebSockets for live logs
5. Editable files with diff, approval, backup, and rollback
6. AI command proposals routed through permission gates
7. Notifications and multi-computer discovery
