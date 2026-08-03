# EXOTIC Venture Workspace

Everything Is Exotic.

The unified venture workspace shell. It reads the canonical workspace and operations state from
the EXOTIC Codex bridge, then presents all ten studios as connected views over the same venture,
objectives, graph, tasks, artifacts, evidence, approvals, metrics, and runtime controls.

## Run

```powershell
npm run dev --workspace=@exotic/studio
```

Start the bridge first with:

```powershell
npm --prefix operations-console run codex:live
```

Set `VITE_EXOTIC_BRIDGE_URL` when the bridge is not available at `http://127.0.0.1:8787`.

The shell never substitutes demo state for a failed connection. Offline state is explicit so the
operator can distinguish real venture data from a disconnected interface.
