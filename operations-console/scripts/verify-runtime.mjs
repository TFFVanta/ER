import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createVentureWorkspace } from '../../packages/entity/dist/index.js';

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
      server.close((error) => (error ? reject(error) : resolve(port)));
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
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Runtime health check timed out.\n${logs.join('')}`);
}

async function request(baseUrl, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(response.ok, true, `${pathname} returned ${response.status}`);
  return response.json();
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}/api/v1`;
fs.mkdirSync(bridgeRoot, { recursive: true });
const staleWorkspace = createVentureWorkspace({
  request: 'verify generated workspace migration',
  operator: 'runtime-verifier',
  ventureName: 'Runtime verification venture',
  now: '2026-07-28T00:00:00.000Z',
});
staleWorkspace.graphEdges = staleWorkspace.graphEdges.filter(
  (edge) => edge.relation !== 'implements' && edge.relation !== 'produces',
);
fs.writeFileSync(path.join(bridgeRoot, 'venture-workspace.json'), JSON.stringify(staleWorkspace, null, 2));
const child = spawn(process.execPath, [runtimeFile], {
  cwd: consoleRoot,
  env: {
    ...process.env,
    PORT: String(port),
    EXOTIC_AUTO_TICK_MS: '200',
    EXOTIC_WORKER_BACKEND: 'local',
    EXOTIC_BRIDGE_ROOT: bridgeRoot,
    EXOTIC_WORKSPACE_ROOT: workspaceRoot,
    EXOTIC_WORKSPACE_FALLBACK_ROOT: fallbackRoot,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
child.stdout.on('data', (chunk) => logs.push(chunk.toString()));
child.stderr.on('data', (chunk) => logs.push(chunk.toString()));

try {
  const health = await waitForHealth(baseUrl, child);
  assert.equal(health.ok, true);

  const snapshot = await request(baseUrl, '/console/snapshot');
  assert.ok(snapshot.bridge?.mind?.objective, 'Systems Mind objective is missing.');
  assert.ok(snapshot.bridge?.roadmap?.length >= 4, 'Roadmap contract is missing.');
  assert.equal(snapshot.bridge?.bounty?.mode, 'running');
  assert.equal(snapshot.bridge?.bounty?.status, 'scope-locked');
  assert.equal(snapshot.bridge?.bounty?.safety?.scopeLock, true);
  const bounty = await request(baseUrl, '/bridge/bounty');
  assert.equal(bounty.gates.allowed, false);
  assert.ok(bounty.safety.prohibitedActivities.includes('scope-bypass'));
  const untrustedBountyAccess = await fetch(`${baseUrl}/bridge/bounty`, {
    headers: { Origin: 'https://untrusted.example' },
  });
  assert.equal(untrustedBountyAccess.status, 403);
  const untrustedBountyAction = await fetch(`${baseUrl}/bridge/bounty/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://untrusted.example',
    },
    body: JSON.stringify({ action: 'set-control', value: { mode: 'running' } }),
  });
  assert.equal(untrustedBountyAction.status, 403);
  const bountyBudgets = await request(baseUrl, '/bridge/bounty/actions', {
    action: 'update-budgets',
    value: {
      dailyUsd: 3,
      monthlyUsd: 60,
      requestsPerMinute: 10,
      requestsPerDay: 300,
      runtimeMinutesPerDay: 30,
      maxConcurrency: 2,
    },
  });
  assert.equal(bountyBudgets.snapshot.budgets.dailyUsd, 3);
  assert.equal(bountyBudgets.snapshot.status, 'scope-locked');
  const initialProgress = snapshot.bridge.roadmap.find((item) => item.id === 'P1-01')?.progress;
  await new Promise((resolve) => setTimeout(resolve, 450));
  const tickSnapshot = await request(baseUrl, '/console/snapshot');
  assert.equal(
    tickSnapshot.bridge.roadmap.find((item) => item.id === 'P1-01')?.progress,
    initialProgress,
    'Auto tick changed progress without evidence.',
  );
  assert.equal(tickSnapshot.bridge.execution?.evidenceRequired, true);
  assert.equal(tickSnapshot.bridge.productionFabric?.verificationBarrier, true);
  assert.ok(tickSnapshot.bridge.productionFabric?.layers?.length >= 4);
  assert.equal(tickSnapshot.bridge.productionFabric?.maxConcurrency, 4);

  const migratedWorkspace = await request(baseUrl, '/bridge/workspace');
  const implementedTasks = new Set(
    migratedWorkspace.graphEdges
      .filter((edge) => edge.fromEntityType === 'task' && edge.relation === 'implements')
      .map((edge) => edge.fromEntityId),
  );
  const producingTasks = new Set(
    migratedWorkspace.graphEdges
      .filter((edge) => edge.fromEntityType === 'task' && edge.relation === 'produces')
      .map((edge) => edge.fromEntityId),
  );
  assert.ok(migratedWorkspace.tasks.every((task) => implementedTasks.has(task.taskId)));
  assert.ok(migratedWorkspace.tasks.every((task) => producingTasks.has(task.taskId)));

  const bootstrapRequest = 'Build a professional field operations software venture';
  const preview = await request(baseUrl, '/bridge/workspace/bootstrap', {
    mode: 'preview',
    request: bootstrapRequest,
    operator: 'runtime-verifier',
    ventureName: 'Field Operations Cloud',
    ventureType: 'software-product',
  });
  assert.equal(preview.mode, 'preview');
  assert.equal(preview.persisted, false);
  assert.equal(preview.summary.requiredOutputs, 13);
  assert.equal(preview.summary.studios, 10);
  const workspaceAfterPreview = await request(baseUrl, '/bridge/workspace');
  assert.equal(
    workspaceAfterPreview.venture.ventureId,
    migratedWorkspace.venture.ventureId,
    'Preview replaced the persisted workspace.',
  );

  const unconfirmedCommit = await fetch(`${baseUrl}/bridge/workspace/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'commit',
      request: bootstrapRequest,
      operator: 'runtime-verifier',
      ventureName: 'Field Operations Cloud',
      ventureType: 'software-product',
    }),
  });
  assert.equal(unconfirmedCommit.status, 409);

  const committedBootstrap = await request(baseUrl, '/bridge/workspace/bootstrap', {
    mode: 'commit',
    request: bootstrapRequest,
    operator: 'runtime-verifier',
    ventureName: 'Field Operations Cloud',
    ventureType: 'software-product',
    replaceExisting: true,
  });
  assert.equal(committedBootstrap.persisted, true);
  assert.equal(committedBootstrap.workspace.venture.thesis, bootstrapRequest);
  assert.equal(committedBootstrap.state.autoMode, 'paused');
  assert.ok(committedBootstrap.archivePath);
  assert.equal(fs.readdirSync(path.join(bridgeRoot, 'workspace-archive')).length, 1);
  assert.ok(fs.readdirSync(workspaceRoot).length > 0, 'Bootstrap did not materialize workspace files.');
  const persistedBootstrap = await request(baseUrl, '/bridge/workspace');
  assert.equal(persistedBootstrap.venture.ventureId, committedBootstrap.workspace.venture.ventureId);
  assert.equal(persistedBootstrap.outputManifest.length, 13);

  const note = await request(baseUrl, '/bridge/message', {
    author: 'runtime-verifier',
    kind: 'contract-test',
    message: 'Isolated bridge persistence check.',
  });
  assert.equal(note.ok, true);
  assert.equal(fs.existsSync(path.join(bridgeRoot, 'inbox.ndjson')), true);

  const paused = await request(baseUrl, '/bridge/auto-mode', {
    mode: 'paused',
  });
  assert.equal(paused.state.autoMode, 'paused');

  // Progress increases require evidence - see codex-bridge-runtime.mjs's updateRoadmapItem().
  // Confirm the rejection path first, then confirm it succeeds once evidence is supplied.
  const rejected = await fetch(`${baseUrl}/bridge/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'P1-01', status: 'running', progress: 70 }),
  });
  assert.equal(rejected.ok, false, 'Progress increase without evidence should be rejected.');
  assert.equal(rejected.status, 400);

  const stateFile = path.join(bridgeRoot, 'state.json');
  const stateWithStaleBlocker = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  stateWithStaleBlocker.blockers = [
    { stepId: 'P1-01', reason: 'resolved contract-test blocker', recordedAt: new Date().toISOString() },
  ];
  fs.writeFileSync(stateFile, JSON.stringify(stateWithStaleBlocker, null, 2));

  const roadmap = await request(baseUrl, '/bridge/roadmap', {
    id: 'P1-01',
    status: 'running',
    progress: 70,
    evidence: ['contract-test verified P1-01 advanced to 70%'],
  });
  assert.equal(roadmap.item.progress, 70);
  const blockerClearedSnapshot = await request(baseUrl, '/console/snapshot');
  assert.equal(
    blockerClearedSnapshot.bridge.blockers.some((blocker) => blocker.stepId === 'P1-01'),
    false,
  );

  const resumed = await request(baseUrl, '/bridge/auto-mode', {
    mode: 'running',
  });
  assert.equal(resumed.state.autoMode, 'running');

  const finalSnapshot = await request(baseUrl, '/console/snapshot');
  assert.equal(finalSnapshot.bridge.automation.mode, 'running');
  assert.equal(finalSnapshot.bridge.roadmap.find((item) => item.id === 'P1-01')?.progress, 70);
  assert.ok(finalSnapshot.bridge.messages.some((item) => item.kind === 'contract-test'));
  assert.equal(child.exitCode, null, 'Runtime exited during contract verification.');

  for (const stepId of ['P1-01', 'P1-02', 'P1-03', 'P1-04']) {
    const completed = await request(baseUrl, '/bridge/roadmap', {
      id: stepId,
      status: 'completed',
      progress: 100,
      evidence: [`contract-test verified ${stepId} completion`],
    });
    assert.equal(completed.item.status, 'completed');
  }
  const parallelWave = await request(baseUrl, '/console/snapshot');
  assert.deepEqual([...parallelWave.bridge.productionFabric.activeStepIds].sort(), ['P1-05', 'P1-12']);
  assert.equal(parallelWave.bridge.executionFabric.cells.length, 2);
  assert.ok(parallelWave.bridge.executionFabric.cells.every((cell) => cell.evidenceRequired));

  console.log('EXOTIC bridge runtime verification: PASS');
} finally {
  child.kill();
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 1500);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
