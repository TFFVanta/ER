import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const consoleRoot = path.resolve(scriptRoot, '..');
const runtimeFile = path.join(scriptRoot, 'codex-bridge-runtime.mjs');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-runtime-'));
const bridgeRoot = path.join(temporaryRoot, 'bridge');
const workspaceRoot = path.join(temporaryRoot, 'workspaces');
const fallbackRoot = path.join(temporaryRoot, 'fallback-workspaces');
const logs = [];

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, `Runtime exited early.\n${logs.join('')}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      // The child may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Runtime health check timed out.\n${logs.join('')}`);
}

async function request(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  assert.equal(response.ok, true, `${pathname} returned ${response.status}`);
  return response.json();
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}/api/v1`;
const child = spawn(process.execPath, [runtimeFile], {
  cwd: consoleRoot,
  env: {
    ...process.env,
    PORT: String(port),
    EXOTIC_AUTO_TICK_MS: '200',
    EXOTIC_BRIDGE_ROOT: bridgeRoot,
    EXOTIC_WORKSPACE_ROOT: workspaceRoot,
    EXOTIC_WORKSPACE_FALLBACK_ROOT: fallbackRoot
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
child.stdout.on('data', chunk => logs.push(chunk.toString()));
child.stderr.on('data', chunk => logs.push(chunk.toString()));

try {
  const health = await waitForHealth(baseUrl, child);
  assert.equal(health.ok, true);

  const snapshot = await request(baseUrl, '/console/snapshot');
  assert.ok(snapshot.bridge?.mind?.objective, 'Systems Mind objective is missing.');
  assert.ok(snapshot.bridge?.roadmap?.length >= 4, 'Roadmap contract is missing.');
  const initialProgress = snapshot.bridge.roadmap.find(item => item.id === 'P1-01')?.progress;
  await new Promise(resolve => setTimeout(resolve, 450));
  const tickSnapshot = await request(baseUrl, '/console/snapshot');
  assert.equal(tickSnapshot.bridge.roadmap.find(item => item.id === 'P1-01')?.progress, initialProgress, 'Auto tick changed progress without evidence.');
  assert.equal(tickSnapshot.bridge.execution?.evidenceRequired, true);
  assert.equal(tickSnapshot.bridge.productionFabric?.verificationBarrier, true);
  assert.ok(tickSnapshot.bridge.productionFabric?.layers?.length >= 4);
  assert.equal(tickSnapshot.bridge.productionFabric?.maxConcurrency, 4);

  const note = await request(baseUrl, '/bridge/message', {
    author: 'runtime-verifier',
    kind: 'contract-test',
    message: 'Isolated bridge persistence check.'
  });
  assert.equal(note.ok, true);
  assert.equal(fs.existsSync(path.join(bridgeRoot, 'inbox.ndjson')), true);

  const paused = await request(baseUrl, '/bridge/auto-mode', { mode: 'paused' });
  assert.equal(paused.state.autoMode, 'paused');

  // Progress increases require evidence - see codex-bridge-runtime.mjs's updateRoadmapItem().
  // Confirm the rejection path first, then confirm it succeeds once evidence is supplied.
  const rejected = await fetch(`${baseUrl}/bridge/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'P1-01', status: 'running', progress: 70 })
  });
  assert.equal(rejected.ok, false, 'Progress increase without evidence should be rejected.');
  assert.equal(rejected.status, 400);

  const roadmap = await request(baseUrl, '/bridge/roadmap', {
    id: 'P1-01',
    status: 'running',
    progress: 70,
    evidence: ['contract-test verified P1-01 advanced to 70%']
  });
  assert.equal(roadmap.item.progress, 70);

  const resumed = await request(baseUrl, '/bridge/auto-mode', { mode: 'running' });
  assert.equal(resumed.state.autoMode, 'running');

  const finalSnapshot = await request(baseUrl, '/console/snapshot');
  assert.equal(finalSnapshot.bridge.automation.mode, 'running');
  assert.equal(finalSnapshot.bridge.roadmap.find(item => item.id === 'P1-01')?.progress, 70);
  assert.ok(finalSnapshot.bridge.messages.some(item => item.kind === 'contract-test'));
  assert.equal(child.exitCode, null, 'Runtime exited during contract verification.');

  for (const stepId of ['P1-01', 'P1-02', 'P1-03', 'P1-04']) {
    const completed = await request(baseUrl, '/bridge/roadmap', {
      id: stepId,
      status: 'completed',
      progress: 100,
      evidence: [`contract-test verified ${stepId} completion`]
    });
    assert.equal(completed.item.status, 'completed');
  }
  const parallelWave = await request(baseUrl, '/console/snapshot');
  assert.deepEqual(
    [...parallelWave.bridge.productionFabric.activeStepIds].sort(),
    ['P1-05', 'P1-12']
  );
  assert.equal(parallelWave.bridge.executionFabric.cells.length, 2);
  assert.ok(parallelWave.bridge.executionFabric.cells.every(cell => cell.evidenceRequired));

  console.log('EXOTIC bridge runtime verification: PASS');
} finally {
  child.kill();
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 1500);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
