# EXOTIC v1 Build Baseline

Last verified: 2026-07-26

## Canonical Gate

Run the complete local baseline from the repository root:

```powershell
npm run verify
```

The gate runs, in order:

1. Turbo builds all buildable npm workspaces.
2. Turbo runs every configured workspace test after its build dependency.
3. The EXOTIC Operations Console verifies its required distribution files and primary operator surfaces, including Systems Mind.

## Verified Result

- 25 npm workspaces were discovered.
- 23 build tasks passed.
- 47 build and test tasks passed.
- A forced uncached run passed with zero Turbo cache reuse.
- The operations console distribution verification passed.
- The isolated bridge contract passed health, state, note persistence, pause/resume, roadmap mutation, and anti-theater progress checks.
- The live bridge on the default port 8787 returned populated `bridge.mind`, `bridge.execution`, and `bridge.verification` contracts.

## Remaining Before P1-01 Completion

- Reduce or formally classify the existing repository migration noise so new changes remain auditable.
- Add CI execution of `npm run verify:clean` on the canonical branch.

Passing this baseline establishes build health. It does not certify product completeness, release readiness, or the quality of every unconfigured workspace.
