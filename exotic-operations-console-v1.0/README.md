# EXOTIC Operations Console v1.0

A unified professional frontend for EXOTIC Continuous Operations Runtime v1.0.

## Product canon

EXOTIC is an AI-native venture creation and operations workspace.

The console exists to let an operator observe, direct, and verify that workspace as it turns broad venture requests into connected execution across ideas, business, product, design, website, development, marketing, research, workflows, and operations.

The console should always reflect the same core truth: EXOTIC must generate real editable artifacts, connected implementations, visible evidence, and governed progress rather than describing hypothetical work.

The package includes:

- A prebuilt browser application that requires no frontend compilation
- A Windows Electron desktop wrapper
- A one-click browser launcher
- A mock live runtime server
- A complete demo data set
- An end-to-end simulation
- A live HTTP adapter contract for the C++ runtime
- Responsive desktop, tablet, and mobile layouts

## Included surfaces

Overview, Objectives, Proposals, Approvals, Scheduler, Agents, Resources, Operations, Audit Timeline, Traces, Alerts, System Health, Emergency Controls, and Settings.

## Fastest launch: browser demo

Windows:

```bat
Launch-Browser-Console.cmd
```

Or:

```powershell
node scripts/serve.mjs
```

Open `http://127.0.0.1:4173`.

The prebuilt `dist/index.html` also opens directly in a browser, although the local server is recommended.

## Live simulation demo

```bat
Launch-Live-Demo.cmd
```

This runs an included mock runtime at `http://127.0.0.1:8787`. In the console, select **Live**. The console then retrieves its snapshot through the same HTTP contract expected from the C++ runtime adapter.

## Windows desktop app

Requirements:

- Windows 10 or 11
- Node.js 20 or later
- npm

One-line launch from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\INSTALL-AND-RUN.ps1 -Mode Desktop
```

Or double-click:

```bat
Launch-Desktop-Console.cmd
```

The first desktop launch installs Electron locally, then opens the prebuilt console in a native window.

## Build Windows installers

```powershell
powershell -ExecutionPolicy Bypass -File .\INSTALL-AND-RUN.ps1 -Mode Package
```

Or:

```bat
Build-Windows-Desktop-Package.cmd
```

Outputs are placed in `release/`:

- NSIS installer
- Portable Windows executable

## Browser hosting

Upload the contents of `dist/` to any static host, including Hostinger, Cloudflare Pages, GitHub Pages, Netlify, or an internal EXOTIC server.

Hostinger target:

```text
public_html/console/
```

Then open:

```text
https://your-domain.example/console/
```

## Runtime connection

The default live endpoint is:

```text
http://127.0.0.1:8787/api/v1
```

Change it in **Settings → Runtime connection**.

The required contract is documented in:

```text
docs/RUNTIME_API_ADAPTER.md
```

The console deliberately performs no client-side authority expansion. Approval, emergency-stop, resource, and execution actions must be enforced again by the runtime.

## Source layout

```text
dist/                  Prebuilt browser app
src/                   Readable browser source
public/                ER identity assets
desktop/               Electron wrapper
scripts/               Static server, mock runtime, verification
docs/                  API contract, save bundle, validation
Launch-Browser-Console.cmd         Browser demo
Launch-Live-Demo.cmd               Mock live mode
Launch-Desktop-Console.cmd         Windows desktop mode
Launch-Codex-Bridge-Console.cmd    Live Codex bridge console
Build-Windows-Desktop-Package.cmd  Installer and portable EXE packaging
```

## Verify package integrity

```powershell
npm run verify
```

This performs structural verification without installing Electron.

## Design system

- White workspace
- Thick black structural borders
- Sharp geometric layouts
- Solid Flamingo Pink, Baby Yellow, and Light Sky Blue accents
- Green success, orange warning, red error
- No gradients
- Familiar professional navigation
- Responsive inspection patterns
- ER application identity

## Bundle identity

```text
EXOTIC-OPERATIONS-CONSOLE-1.0
```
