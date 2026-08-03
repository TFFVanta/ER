# EXOTIC Workspace

## Product Canon

EXOTIC is an AI-native venture creation and operations workspace.

It turns a broad request into a real venture workspace across ideas, business, product, design, website, development, marketing, research, workflows, and operations. Those studios are not separate apps. They operate on shared objectives, graph state, memory, agents, authority, runtime, artifacts, and evidence.

The system must produce real editable outputs and connected implementations, not just plans or suggestions.

## Getting Started

This directory is the live working tree — clone or pull it, there is nothing to extract.

```powershell
npm install
npm run portal:dev
```

Then open the local URL shown by Vite.

## Build

```powershell
npm run portal:build
```

## Workspace Commands

```powershell
npm run build
npm run test
npm run exo -- help
```

## Running Auto Mode Offline and Free

Auto mode dispatches roadmap steps to a worker backend. By default that backend is `local`,
which calls a self-hosted, OpenAI-compatible chat-completions server on your machine - no paid
API key, no internet connection required once the model is downloaded.

1. Install [Ollama](https://ollama.com) (or LM Studio, or any other OpenAI-compatible local
   server) and pull a coding-capable model, e.g. `ollama pull qwen2.5-coder:7b`.
2. Set the endpoint before starting the bridge or running `exo worker run`:
   ```powershell
   $env:EXOTIC_LOCAL_MODEL_ENDPOINT = "http://localhost:11434/v1"
   $env:EXOTIC_LOCAL_MODEL_NAME = "qwen2.5-coder:7b"
   ```
3. Run a step: `npm run exo -- worker run <step-id>`.

The local backend instructs the model to reply with `===EXOTIC-WRITE-FILE:===` /
`===EXOTIC-DELETE-FILE:===` blocks (see `packages/codex-worker/src/apply-edits.ts`) and applies
them as real file edits before capturing evidence - a step only counts as done if a file
actually changed.

To use a paid CLI backend instead, set `EXOTIC_WORKER_BACKEND=claude` or `codex` (requires that
CLI installed and authenticated).

## Phone Portal

`PORTAL/` is a separate, LAN-only control surface (Python + vanilla JS) for checking build
status, viewing logs, and browsing/editing project files from a phone. It is independent of
the Vite portal above.

1. Double-click `PORTAL\Launch-Portal-Server.cmd` (or run `python PORTAL/server.py`). Keep the
   console window open — it prints the pairing URL.
2. First run generates a fresh auth token in `PORTAL/data/config.json` (gitignored — never
   commit it).
3. On your phone, open the printed URL while both devices are on the same Wi-Fi, then
   "Add to Home Screen" in Chrome for an app-like shortcut.
4. Optional: right-click `PORTAL\Enable-Portal-Lan-Access.cmd` → Run as administrator, once, to
   open the firewall port on your **private** network profile only.

Never expose port 8765 to the public internet.

## Entry Scripts

```text
Launch-Operations-Console.cmd    Open the live operations console and Codex bridge
Launch-Portal-Server.cmd         Start the phone portal server (delegates to PORTAL/)
Enable-Portal-Lan-Access.cmd     Open the portal's firewall port on the private network profile
```

## Desktop Apps

Two real desktop shells exist, wrapping different UIs - not duplicates:

- `apps/desktop` - the official EXOTIC desktop app: the Studio workspace shell with an
  in-process Codex bridge. `npm run start --workspace=@exotic/desktop`.
- `operations-console/desktop` - the Operations Console shell (control plane, not
  Studio). `npm run desktop --prefix operations-console`.

`exotic-native/EXOTIC-Native` is a separate native C++ GUI belonging to the C++ track (see
`exotic-native/`), built and launched through the Phone Portal above, not through npm.
