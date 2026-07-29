import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The bridge script imports its sibling packages (@exotic/entity, @exotic/contracts,
// @exotic/codex-worker, @exotic/pattern-composer, and their own transitive deps) as bare
// specifiers, resolved in dev via the npm workspace's node_modules/@exotic/* symlinks. A
// packaged Electron app has no such symlinks. Rather than hand-mirror that node_modules
// layout into the package (fragile - breaks silently if a dependency changes), bundle the
// whole thing into one self-contained file with esbuild. Node builtins (node:http, node:fs,
// ...) are left as external automatically by platform: 'node'.
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const scriptsDir = path.join(repoRoot, 'exotic-operations-console-v1.0', 'scripts');
const liveEntry = path.join(scriptsDir, 'codex-bridge-runtime.mjs');
const outfile = path.join(desktopRoot, 'bridge', 'codex-bridge-runtime.bundle.mjs');

// The live working tree currently has codex-bridge-runtime.mjs referencing dev-admin/
// isolated-execution exports (DevAdminLeaseStore, createIsolatedExecution, ...) that don't
// exist yet in packages/codex-worker - unrelated in-progress work by someone else, still
// mid-edit. Rather than guess at that feature's implementation to unblock packaging, pin the
// bundled bridge to the last commit where the file was internally consistent. Bump
// PINNED_BRIDGE_REF forward once that work lands and this script's build succeeds again
// against the live file.
const PINNED_BRIDGE_REF = process.env.EXOTIC_BRIDGE_PIN || 'a27e258';

function extractPinnedEntry() {
  const content = execFileSync(
    'git',
    ['show', `${PINNED_BRIDGE_REF}:exotic-operations-console-v1.0/scripts/codex-bridge-runtime.mjs`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  // Written alongside the live file (not e.g. under apps/desktop) so its relative imports
  // ("../../packages/entity/dist/index.js", ...) resolve to the same real packages/ tree.
  const pinnedPath = path.join(scriptsDir, `.codex-bridge-runtime.pinned-${PINNED_BRIDGE_REF}.mjs`);
  fs.writeFileSync(pinnedPath, content);
  return pinnedPath;
}

function tryBuild(entry) {
  return esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    logLevel: 'info',
  });
}

let pinnedPath;
try {
  await tryBuild(liveEntry);
  console.log(`Bundled bridge runtime (live working tree) -> ${outfile}`);
} catch (liveError) {
  console.warn(
    `Live codex-bridge-runtime.mjs failed to bundle (likely unrelated in-progress work - see ` +
      `this script's PINNED_BRIDGE_REF comment). Falling back to pinned commit ${PINNED_BRIDGE_REF}.`,
  );
  pinnedPath = extractPinnedEntry();
  try {
    await tryBuild(pinnedPath);
    console.log(`Bundled bridge runtime (pinned to ${PINNED_BRIDGE_REF}) -> ${outfile}`);
  } finally {
    fs.rmSync(pinnedPath, { force: true });
  }
}
