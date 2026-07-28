import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const toolingRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolingRoot, '..');
const outputFile = path.join(repoRoot, '.exotic', 'codex-bridge', 'verification.json');
const clean = process.argv.includes('--clean');

function workspaceManifests(directory) {
  const root = path.join(repoRoot, directory);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({ dir: path.join(root, entry.name), name: entry.name, manifestPath: path.join(root, entry.name, 'package.json') }))
    .filter(entry => fs.existsSync(entry.manifestPath))
    .map(entry => ({ ...entry, manifest: JSON.parse(fs.readFileSync(entry.manifestPath, 'utf8')) }));
}

// Runs a package's own script directly in its own directory rather than trusting that
// an earlier `npm run build`/`npm test` at the repo root actually covered it - this file
// is meant to be trustworthy evidence on its own, including when run standalone.
function runScript(workspace, scriptName) {
  const args = ['run', scriptName];
  if (clean && scriptName === 'build') args.push('--', '--force');
  // npm ships as a .cmd shim on Windows; spawning it without a shell fails with EINVAL
  // regardless of arguments. Node warns when shell:true is combined with an args array
  // (unescaped concatenation), so build a single command string instead - scriptName only
  // ever comes from our own package.json scan (workspaceManifests), never external input.
  const isWin = process.platform === 'win32';
  const result = spawnSync(
    isWin ? `npm ${args.join(' ')}` : 'npm',
    isWin ? undefined : args,
    {
      cwd: workspace.dir,
      stdio: 'pipe',
      encoding: 'utf8',
      shell: isWin,
    },
  );
  const exitCode = result.status ?? 1;
  return {
    workspace: workspace.name,
    script: scriptName,
    passed: exitCode === 0,
    exitCode,
    ...(exitCode !== 0 ? { output: `${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-4000) } : {}),
  };
}

const workspaces = [...workspaceManifests('apps'), ...workspaceManifests('packages')];

const buildResults = workspaces
  .filter(w => w.manifest.scripts?.build)
  .map(w => runScript(w, 'build'));
const testResults = workspaces
  .filter(w => w.manifest.scripts?.test)
  .map(w => runScript(w, 'test'));

const consoleDir = path.join(repoRoot, 'exotic-operations-console-v1.0');
const consoleManifestPath = path.join(consoleDir, 'package.json');
let consoleResult = { passed: true, skipped: true };
if (fs.existsSync(consoleManifestPath)) {
  const consoleManifest = JSON.parse(fs.readFileSync(consoleManifestPath, 'utf8'));
  if (consoleManifest.scripts?.verify) {
    const r = runScript({ dir: consoleDir, name: 'exotic-operations-console-v1.0' }, 'verify');
    consoleResult = { passed: r.passed, exitCode: r.exitCode, skipped: false, ...(r.output ? { output: r.output } : {}) };
  }
}

const buildPassed = buildResults.filter(r => r.passed).length;
const testPassed = testResults.filter(r => r.passed).length;
const allPassed = buildResults.every(r => r.passed) && testResults.every(r => r.passed) && consoleResult.passed;

const verification = {
  schemaVersion: 2,
  status: allPassed ? 'passed' : 'failed',
  mode: clean ? 'forced-uncached' : 'cache-allowed',
  verifiedAt: new Date().toISOString(),
  workspaces: workspaces.length,
  build: { passed: buildPassed, total: buildResults.length, failures: buildResults.filter(r => !r.passed) },
  test: { passed: testPassed, total: testResults.length, failures: testResults.filter(r => !r.passed) },
  totalTasks: buildResults.length + testResults.length,
  console: consoleResult.skipped
    ? { isolatedRuntime: 'skipped' }
    : { isolatedRuntime: consoleResult.passed ? 'passed' : 'failed' },
  command: clean ? 'npm run verify:clean' : 'npm run verify',
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(verification, null, 2)}\n`);
console.log(`EXOTIC verification evidence recorded: ${outputFile} (status: ${verification.status})`);

if (!allPassed) {
  process.exitCode = 1;
}
