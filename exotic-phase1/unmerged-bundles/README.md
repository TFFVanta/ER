# Unmerged runtime bundles

These five folders were previously scattered at the JS monorepo root
(`C:\Projects\Exotic`). They are C++ patch bundles and an installer targeting
**this** project (`exotic-phase1/`, "Exotic Runtime + Portal v0.4") — its
`src/exotic/autonomy/{agents,governance,persistence,resources,scheduler}` and
`src/exotic/runtime` layout is what `EXOTIC-Live-Integrator-v1.0` and the four
version bundles (v0.3–v1.0) expect to patch. They were moved here, unmodified,
so the JS monorepo root stops carrying disconnected C++ content and the
bundles sit next to the codebase they actually apply to.

They are **not** targeting `Exotic/` (the sibling capitalized folder, a
separate git repo) — that project has since pivoted to a different layout
(`src/Core`, `src/Device`, `src/Network`, `src/UI`) and no longer matches what
these bundles patch, despite the bundles' own generic README wording saying
"copy into the EXOTIC repository."

## Status: not yet integrated

Nobody has run the integration. `Install-EXOTIC-v1.ps1` bootstraps vcpkg,
requires an MSVC toolchain, builds the whole project, and runs a full CTest +
simulation cycle — a real, semi-slow, tool-installing operation, not just a
file copy. Run it deliberately when ready, with the corrected workspace path
(its packaged default of `C:\Projects\Exotic` is stale from before this move):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\EXOTIC-Live-Integrator-v1.0\Install-EXOTIC-v1.ps1 -Workspace C:\Projects\Exotic\exotic-phase1 -BootstrapVcpkg
```

See `EXOTIC-Live-Integrator-v1.0/README.md` for what it does step by step, and
`Rollback-EXOTIC-v1.ps1` if it needs to be undone.
