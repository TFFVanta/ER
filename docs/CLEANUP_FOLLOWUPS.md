# Cleanup Follow-Ups

Written during the 2026-07-27 security/quality/repo-hygiene pass (see git history around this
file's introduction). These are directories the audit flagged as ambiguous — plausibly dead,
but not confidently enough to delete without someone who knows their history weighing in.
None of these were touched by that pass.

## Resolved 2026-07-28

1. ~~`exotic-sdk-core/`~~ — its Universal Object Model / State / Metadata Fabric / Memory Graph
   content had no overlap with `packages/sdk` (which was just a re-export barrel), so it was
   ported into a new `packages/object-model/` workspace package, wired up with proper
   build/test scripts, and `packages/sdk` now re-exports it. The orphaned standalone copy was
   deleted.

2. ~~`exotic-frontend/`~~ — confirmed orphaned (no build/CI wiring, hardcoded fake data,
   conceptually superseded by the root portal) and deleted.

3. ~~`MINGO-Studio/`~~ — confirmed almost entirely empty directories, with the one populated
   subfolder being an unmodified `create-vite` template. Deleted entirely.

4. ~~`apps/studio` vs `exotic-studio/`~~ — `apps/studio` was a 3-line `@exotic/core` smoke
   check, not a real UI; `exotic-studio/` was the actual Studio workspace UI. Promoted
   `exotic-studio`'s real files into `apps/studio` as `@exotic/studio` (dropping dead/empty
   scaffold subdirectories that `App.jsx` never imported, and an unused template `index.css`
   that conflicted with the real layout). The old smoke check's value was preserved as a real
   test in `packages/core/tests/smoke.test.ts` instead of being lost.

5. **Nested `Exotic/` git clone** — partially resolved. Turned out to have significant
   uncommitted local work (modified/deleted files, several never-committed directories
   including `EXOTIC-Native/` itself), and there's *already* a separate clean clone of the same
   GitHub remote (`mingovoid-boop/Exotic`) at `C:\Projects\Exotic-GitHub`. Relocating it as
   originally planned would have created a third divergent copy without resolving the real
   issue (uncommitted work with no safe home) — decided to leave it in place for now rather than
   guess. What *was* fixed: `PORTAL/server.py`'s `SOURCE` path was pointed at the wrong CMake
   project (the top-level `Exotic/CMakeLists.txt` only builds an unrelated `ExoticBuilder`
   scaffolding tool, not the native GUI shell) — `SOURCE` now points directly at
   `Exotic/EXOTIC-Native/`, whose own `CMakeLists.txt` builds the actual `EXOTIC.exe` GUI target,
   so the portal's build/run buttons now target the right thing. Still open: reconcile the
   uncommitted work in the nested copy against `Exotic-GitHub` and decide on one canonical
   external location.

## Also noted, not yet acted on

- ~~`npm audit` reports 2 high-severity vulnerabilities~~ — fixed via `npm audit fix`
  (`brace-expansion` DoS, `postcss` sourcemap path traversal); 0 vulnerabilities as of this note.
  Also pinned `exotic-operations-console-v1.0`'s `electron`/`electron-builder` deps off `latest`
  to specific versions, since an unpinned major-version dependency with no lockfile in that
  package made its builds non-reproducible.
- Git history still contains the portal auth token that was rotated out of the working tree in
  this pass (`PORTAL/data/config.json`, now gitignored). Rotating was judged sufficient for a
  private repo; a history rewrite (`git filter-repo` + force-push) would be needed to fully
  scrub it, and that's a separate, explicit decision — it rewrites every downstream clone's
  history.
