# Exotic Studio

Everything Is Exotic.

The visual EXOTIC workspace UI — engines/templates rail, a Universal Graph canvas, and a live
Inspector panel. A Vite + React app, standalone from the rest of the npm workspace (no
`@exotic/*` package dependencies yet).

## Run

```powershell
npm run dev --workspace=@exotic/studio
```

Promoted from the standalone `exotic-studio` prototype into `apps/studio`, replacing the earlier
one-line `@exotic/core` smoke check (that check now lives as a real test in
`packages/core/tests/smoke.test.ts`).
