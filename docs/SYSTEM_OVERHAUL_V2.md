# EXOTIC System Overhaul v2

Date: 2026-07-26

## Outcome

EXOTIC now has a fixed, full-screen operations workspace aligned to the serious solo developer and creator workflow. It uses the supplied ER mark, true black and white, compact technical typography, internal panel scrolling, live roadmap and ecosystem state, Systems Mind, execution evidence, runtime controls, verification results, and a context inspector in one viewport.

The accepted visual specification is stored at `docs/design/exotic-operations-workspace-v2-concept.png`.

## Runtime Guarantees

- Auto mode may select and describe the active roadmap step, but timer ticks cannot increase completion percentages.
- Every auto-mode cycle emits a bounded aligned prompt and requires evidence before progress changes.
- Primary and fallback bridge state are resolved by newest valid data, preventing stale rollback.
- Locked note files fall back safely without terminating the bridge process.
- Live requests are bounded by timeouts and background polling pauses while the workspace is hidden or sleeping.
- Verification results are machine-readable at `.exotic/codex-bridge/verification.json`.

## Verification

`npm run verify` runs the cached-allowed monorepo, console, and isolated runtime gate.

`npm run verify:clean` forces all Turbo build and test work, verifies the generated console distribution, runs the isolated bridge contract, and records machine-readable evidence.

The 2026-07-26 browser QA covered 1440x900 and 820x900 layouts, live connectivity, Operations, Roadmap, Command Palette, Ecosystem selection, horizontal overflow, page exceptions, and console errors.

## Remaining System Work

- Classify and reduce the large repository migration diff so ownership and release boundaries are unambiguous.
- Add CI for the clean verification gate.
- Connect real Codex automation receipts to roadmap evidence updates so unattended runs can advance only after verified work.
- Complete the active P1-05 Ideas and P1-12 Research discovery swarm with real studio-quality artifacts and evidence receipts.
