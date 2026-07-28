# Cleanup Follow-Ups

Written during the 2026-07-27 security/quality/repo-hygiene pass (see git history around this
file's introduction). These are directories the audit flagged as ambiguous — plausibly dead,
but not confidently enough to delete without someone who knows their history weighing in.
None of these were touched by that pass.

1. **`exotic-sdk-core/`** — a real, standalone TypeScript package (own `package.json`,
   `tsconfig.json`, `src/`) that is *not* listed in root `package.json`'s
   `workspaces` (`apps/*`, `packages/*`). Decide: fold it into `packages/sdk` (which already
   exists and may overlap), or keep it standalone and add it to the workspace globs.

2. **`exotic-frontend/`** — large (own `node_modules`), relationship to `exotic-studio/` and the
   root Vite portal (`src/main.jsx`) is unclear. Needs someone with history on why it exists to
   say whether it's live, superseded, or an abandoned experiment.

3. **`MINGO-Studio/`** — an orphaned parallel monorepo scaffold with its own `packages/`
   subdirectories whose names shadow the real `packages/*` (ai, core, sdk, ui, …). Not
   referenced by any root config or script. Likely dead, but deleting a whole second monorepo
   skeleton deserves an explicit go-ahead rather than an inference from "nothing points at it."

4. **`apps/studio` vs `exotic-studio/`** — a naming collision. `apps/studio` is a bare TS
   scaffold in the real npm workspace; `exotic-studio/` is a full standalone Vite+React app with
   its own `node_modules`/`dist`, not wired into the workspace at all. Pick one canonical
   "studio" and rename or retire the other so the name stops being ambiguous.

5. **Nested `Exotic/` git clone** — gitignored, ~220MB, contains its own `.git` with its own
   commit history, a separate CMake C++ project (`Core/`, `Domains/`, `Engines/`, `Modules/`,
   `EXOTIC-Native/`). This is effectively a second, undocumented codebase living inside this
   working tree. Decide: is it meant to be a genuinely separate repository (in which case it
   shouldn't sit inside this working tree at all — clone it elsewhere), or is it stale content
   that should be deleted outright? Note `PORTAL/server.py`'s `configure`/`build`/`run` actions
   (see `SOURCE=PROJECT/"Exotic"`) currently target this directory, so removing it without
   updating that reference would break the portal's build/run buttons.

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
