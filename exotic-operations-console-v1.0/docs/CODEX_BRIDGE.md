# EXOTIC Codex Bridge

The Codex bridge turns the operations console into a live observer for EXOTIC build work.

## What it does

- serves a live console snapshot at `http://127.0.0.1:8787/api/v1/console/snapshot`
- reads repo state from `C:\Projects\Exotic`
- exposes EXOTIC roadmap and build focus from workspace bridge files
- accepts operator notes from the console and writes them into the workspace

## Start it

From `C:\Projects\Exotic\exotic-operations-console-v1.0`:

```bat
START-CODEX-BUILD-CONSOLE.cmd
```

This starts:

- the bridge runtime on port `8787`
- the browser console on port `4173`
- a browser tab already configured for Live mode

## Bridge files

The runtime creates and maintains:

- `C:\Projects\Exotic\.exotic\codex-bridge\state.json`
- `C:\Projects\Exotic\.exotic\codex-bridge\roadmap.json`
- `C:\Projects\Exotic\.exotic\codex-bridge\inbox.ndjson`
- `C:\Projects\Exotic\.exotic\codex-bridge\operator-notes.md`

## Communication model

The console does not directly send a live chat message into Codex.

Instead, it writes operator notes into the workspace bridge files. Codex can then read those notes on future work runs, later replies, or scheduled automation runs attached to this EXOTIC task.
