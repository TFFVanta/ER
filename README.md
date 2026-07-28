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
Install-Exotic-Desktop.cmd       Install the desktop HTA shortcut
```
