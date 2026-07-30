# Changelog

## v1.0.0

First stable release. Full workspace verification passes clean: 29/29 package builds,
30/30 test suites, operations-console build/bounty/bridge-runtime checks all pass
(`.exotic/codex-bridge/verification.json`, `status: "passed"`).

### What's in v1.0

**EXOTIC platform core**
- Codex bridge runtime (`exotic-operations-console-v1.0`) - roadmap-driven autonomous work
  dispatch, evidence-gated completion (`updateRoadmapItem` rejects any status/progress change
  without real evidence), adaptive tick scheduling, retry/backoff on failed dispatches.
- Worker dispatch (`@exotic/codex-worker`) - claude/codex/local CLI backends, working-tree
  evidence capture, and the dev-admin isolated-execution module (real git worktrees, local-only
  merge integration, never pushes/deploys/touches secrets - see its own module doc comment).
- Roadmap patterns (`@exotic/pattern-composer`) - `phase1-foundation` (EXOTIC) and
  `exotic-remedy-launch` (Exotic Remedy), the single source of truth both `exo pattern apply`
  and the bridge's own seeding compose from.
- Cross-venture company engine (`@exotic/company-engine`) - `exo company status` combines
  live ops data, a brand-law audit (mechanically checks both kits' CSS against their own design
  laws), a finance ledger reader (reports "no data" honestly rather than fabricating numbers),
  and repo health (git status + last verification result). Advise-only - no autonomous
  spend/hire/publish authority.
- Authorized bug bounty runtime - passive-only automated security posture checks
  (HTTPS/header baseline, `security.txt` discovery) against operator-attested, explicitly
  scoped assets, hard budget ceilings, everything beyond passive recon human-approval-gated.
  See `docs/BUG_BOUNTY_RUNTIME.md`.

**Apps**
- `apps/forge` - the `exo` CLI (worker, pattern, harmony, company, and objective/proposal/
  approval/selector command groups).
- `apps/studio` - the canonical human workspace UI, connects to the bridge's live state.
- `apps/desktop` - packaged Windows installer + portable exe (Electron, in-process bridge,
  esbuild-bundled with a pinned-commit fallback if the live bridge script is mid-edit).

**Design systems**
- `@exotic/ui` - EXOTIC's own component kit: black-and-white-first, quiet motion, no
  gradients (both mechanically enforced by the brand audit).
- `@exotic/ui-remedy` - Exotic Remedy's component kit: flat pastel fill, bold black outline,
  premium-fun bounce/wiggle motion, classic two-color pattern accents.
- Both kits' `templates/` are type-checked against the built public API on every build.

**Production deployment**
- `mingo.center` is live and connected - GitHub Actions deploy/rollback workflows targeting
  Hostinger, host-aware surface routing (`src/portalConfig.js`), health-check tooling.

### Explicitly NOT in v1.0 scope

Real, but early:
- **Exotic Remedy** - brand identity, aesthetic law, and component kit are done; the actual
  product (designer apparel, launching print-on-demand first per
  `brand/exotic-remedy/MARKETING_STRATEGY.md`) has not been built or sold yet. Roadmap seeded
  (`exotic-remedy-launch`, 6 steps, all pending) but not executed.
- **Bug bounty coverage** - runtime is real and has produced real findings, but only one
  self-owned program (`mingo.center`) is enrolled. No third-party authorized program has been
  added yet.
- **Finance ledger** - mechanism exists (`.exotic/company/ledger.json`), genuinely empty. No
  revenue has been recorded because none has been generated yet.

Legacy scaffolding, unused by any real surface (confirmed via grep - nothing in `apps/` or the
bridge imports them): `packages/{kernel,mesh,sdk,ai,device,events,network,observer,optimizer,
registry,atlas,capability,config,core,logging,utils,app-template,dashboard,object-model}`.
These stay at
`0.1.0` rather than being marked v1.0 - most are 1-40 line stubs from early architectural
exploration that were never wired into a running product. Not deleted (that's a separate
decision), just not claimed as production-ready.

### Versioning

Root and every actively-used package/app bumped to `1.0.0`. The unused-scaffolding packages
listed above intentionally stay at `0.1.0` - bumping them would overstate their maturity.
