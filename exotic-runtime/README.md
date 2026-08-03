# Exotic Runtime + Portal v0.4

Exotic is a universal graph-based runtime organized around:

`Observe → Map → Predict → Align → Act → Measure → Learn`

Portal is its secure mobile command center. It runs from the same C++ executable and connects over your private Wi-Fi without Android Studio, Flutter, Node, or an app store.

## Current capabilities

- Universal State Graph
- Entity, component, relationship, state, and event foundations
- Observer, prediction, alignment, execution, learning, memory, and security engines
- Token-secured Portal PWA
- Project discovery across the Exotic workspace
- Sandboxed source-file browsing from a phone
- Runtime command execution through allowlisted APIs
- Security and activity audit stream

## Visual Studio

Open this folder in Visual Studio as a CMake project and build `exotic.exe`.

Your executable will commonly appear at:

```text
out/build/x64-Debug/exotic.exe
```

## Start Portal

From this project folder:

```powershell
.\out\build\x64-Debug\exotic.exe portal
```

Specify a port and workspace root when needed:

```powershell
.\out\build\x64-Debug\exotic.exe portal 8787 C:\Projects\Exotic
```

Open the printed **Mobile** URL on a phone connected to the same Wi-Fi. Allow the executable through Windows Firewall for **Private networks** only.

## CLI

```text
exotic demo
exotic status
exotic portal [port] [workspace]
exotic help
```

## Security

Portal does not expose a general terminal. The current API is intentionally limited to safe runtime actions, project indexing, and read-only workspace browsing. Paths outside the selected workspace are rejected.

See `docs/PORTAL_PLATFORM.md` for architecture and next-stage implementation priorities.


## Phase 2 Platform Services

Exotic 0.4 adds lifecycle-managed Search, Build, Automation, AI Proposal, Notification, and Device services behind a shared Service Registry. Run `exotic platform` to verify the complete layer. See `docs/PHASE2_PLATFORM_SERVICES.md`.
