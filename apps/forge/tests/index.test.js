import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const cli = path.resolve(root, 'apps/forge/src/index.js');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env
    }
  });
}

test('doctor reports healthy root metadata', () => {
  const result = run(['doctor']);
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  assert.match(result.stdout, /EXOTIC Doctor/);
  assert.match(result.stdout, /Package manager:/);
  assert.match(result.stdout, /(System healthy\.|Issues:)/);
});

test('list packages prints an inventory header', () => {
  const result = run(['list', 'packages']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /EXOTIC packages/);
});

test('help is shown for unknown commands', () => {
  const result = run(['unknown']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Commands:/);
});

test('objective create persists and inspect reloads it from workspace state', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-forge-'));
  const create = run(['objective', 'create', 'Make the scheduler more reliable.'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });

  assert.equal(create.status, 0, create.stderr);
  assert.match(create.stdout, /Created objective /);

  const match = create.stdout.match(/Created objective ([^\r\n]+)/);
  assert.ok(match, create.stdout);
  const objectiveId = match[1];

  const list = run(['objective', 'list'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, new RegExp(objectiveId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspect = run(['objective', 'inspect', objectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.match(inspect.stdout, /"source_goal": "Make the scheduler more reliable\."/);
  assert.match(inspect.stdout, /"status": "defined"/);

  const stateFile = path.join(stateRoot, '.exotic', 'state', 'objectives.json');
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(saved.objectives.length, 1);

  const bundleMatch = create.stdout.match(/Bundle: ([^\r\n]+)/);
  assert.ok(bundleMatch, create.stdout);
  const bundlePath = bundleMatch[1];
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
});

test('proposal create persists a plan and advances the objective to planned', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-proposal-'));
  const createObjective = run(['objective', 'create', 'Make the scheduler more reliable.'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);

  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  assert.match(createProposal.stdout, /Created proposal /);

  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const inspectProposal = run(['proposal', 'inspect', proposalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectProposal.status, 0, inspectProposal.stderr);
  assert.match(inspectProposal.stdout, /"status": "proposed"/);
  assert.match(inspectProposal.stdout, /"decision_state": "draft"/);
  assert.match(inspectProposal.stdout, /"steps"/);

  const inspectObjective = run(['objective', 'inspect', objectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectObjective.status, 0, inspectObjective.stderr);
  assert.match(inspectObjective.stdout, /"status": "planned"/);

  const proposalList = run(['proposal', 'list'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(proposalList.status, 0, proposalList.stderr);
  assert.match(proposalList.stdout, new RegExp(proposalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = createProposal.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, createProposal.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
});

test('proposal admission records approval when authority and budget pass', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-approval-pass-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '60'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);

  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);

  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run([
    'proposal',
    'admit',
    proposalId,
    '--approver',
    'mingo',
    '--authority',
    '1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);
  assert.match(admit.stdout, /Decision: approved/);

  const approvalId = admit.stdout.match(/Recorded approval ([^\r\n]+)/)?.[1];
  assert.ok(approvalId, admit.stdout);

  const inspectApproval = run(['approval', 'inspect', approvalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectApproval.status, 0, inspectApproval.stderr);
  assert.match(inspectApproval.stdout, /"status": "approved"/);
  assert.match(inspectApproval.stdout, /"approved": true/);

  const inspectProposal = run(['proposal', 'inspect', proposalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectProposal.status, 0, inspectProposal.stderr);
  assert.match(inspectProposal.stdout, /"status": "admitted"/);
  assert.match(inspectProposal.stdout, /"decision_state": "approved"/);

  const inspectObjective = run(['objective', 'inspect', objectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectObjective.status, 0, inspectObjective.stderr);
  assert.match(inspectObjective.stdout, /"status": "approved"/);
});

test('proposal admission rejects when budget fails', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-approval-fail-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '15'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);

  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    '--time-minutes',
    '45',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);

  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run([
    'proposal',
    'admit',
    proposalId,
    '--approver',
    'mingo',
    '--authority',
    '1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);
  assert.match(admit.stdout, /Decision: rejected/);

  const approvalId = admit.stdout.match(/Recorded approval ([^\r\n]+)/)?.[1];
  assert.ok(approvalId, admit.stdout);

  const inspectApproval = run(['approval', 'inspect', approvalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectApproval.status, 0, inspectApproval.stderr);
  assert.match(inspectApproval.stdout, /"status": "rejected"/);
  assert.match(inspectApproval.stdout, /time budget exceeded/);

  const inspectProposal = run(['proposal', 'inspect', proposalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectProposal.status, 0, inspectProposal.stderr);
  assert.match(inspectProposal.stdout, /"status": "needs_revision"/);
  assert.match(inspectProposal.stdout, /"decision_state": "rejected"/);
});

test('proposal execution persists one idempotent verified operation', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-operation-pass-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '60'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);

  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run([
    'proposal',
    'admit',
    proposalId,
    '--approver',
    'mingo',
    '--authority',
    '1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);

  const execute = run([
    'proposal',
    'execute',
    proposalId,
    '--idempotency-key',
    'retry-improvement-1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  assert.match(execute.stdout, /Created operation /);

  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const executeAgain = run([
    'proposal',
    'execute',
    proposalId,
    '--idempotency-key',
    'retry-improvement-1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(executeAgain.status, 0, executeAgain.stderr);
  assert.match(executeAgain.stdout, /Reused operation /);
  assert.match(executeAgain.stdout, new RegExp(operationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectOperation = run(['operation', 'inspect', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectOperation.status, 0, inspectOperation.stderr);
  assert.match(inspectOperation.stdout, /"status": "completed"/);
  assert.match(inspectOperation.stdout, /"verification_status": "passed"/);
  assert.match(inspectOperation.stdout, /retry-improvement-1/);

  const inspectProposal = run(['proposal', 'inspect', proposalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectProposal.status, 0, inspectProposal.stderr);
  assert.match(inspectProposal.stdout, /"status": "executed"/);

  const inspectObjective = run(['objective', 'inspect', objectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectObjective.status, 0, inspectObjective.stderr);
  assert.match(inspectObjective.stdout, /"status": "verified"/);

  const operationList = run(['operation', 'list'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(operationList.status, 0, operationList.stderr);
  assert.match(operationList.stdout, new RegExp(operationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = execute.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, execute.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'execution-trace.json')));

  const stateFile = path.join(stateRoot, '.exotic', 'state', 'objectives.json');
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(saved.operations.length, 1);
});

test('operation learning persists one lesson and proposes the next objective', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-learning-pass-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '60'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run([
    'proposal',
    'admit',
    proposalId,
    '--approver',
    'mingo',
    '--authority',
    '1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);

  const execute = run([
    'proposal',
    'execute',
    proposalId,
    '--idempotency-key',
    'retry-improvement-1'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run([
    'operation',
    'learn',
    operationId,
    '--summary',
    'Verified scheduler improvement work should be preserved as a reusable execution pattern.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  assert.match(learn.stdout, /Captured lesson /);
  assert.match(learn.stdout, /Next objective: /);

  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const learnAgain = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learnAgain.status, 0, learnAgain.stderr);
  assert.match(learnAgain.stdout, /Reused lesson /);
  assert.match(learnAgain.stdout, new RegExp(lessonId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectLesson = run(['lesson', 'inspect', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectLesson.status, 0, inspectLesson.stderr);
  assert.match(inspectLesson.stdout, /"status": "captured"/);
  assert.match(inspectLesson.stdout, /"next_objective"/);

  const inspectObjective = run(['objective', 'inspect', objectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectObjective.status, 0, inspectObjective.stderr);
  assert.match(inspectObjective.stdout, /"status": "learned"/);

  const lessonList = run(['lesson', 'list'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(lessonList.status, 0, lessonList.stderr);
  assert.match(lessonList.stdout, new RegExp(lessonId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = learn.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, learn.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'lesson.json')));

  const stateFile = path.join(stateRoot, '.exotic', 'state', 'objectives.json');
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(saved.lessons.length, 1);
});

test('lesson promotion persists one bounded selector candidate', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-selector-pass-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '60'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const objectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(objectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    objectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run(['proposal', 'admit', proposalId, '--approver', 'mingo', '--authority', '1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);

  const execute = run(['proposal', 'execute', proposalId, '--idempotency-key', 'retry-improvement-1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const promote = run(['lesson', 'promote', lessonId, '--type', 'objective'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promote.status, 0, promote.stderr);
  assert.match(promote.stdout, /Created selector /);
  assert.match(promote.stdout, /Candidate: /);

  const selectorId = promote.stdout.match(/Created selector ([^\r\n]+)/)?.[1];
  assert.ok(selectorId, promote.stdout);

  const promoteAgain = run(['lesson', 'promote', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promoteAgain.status, 0, promoteAgain.stderr);
  assert.match(promoteAgain.stdout, /Reused selector /);
  assert.match(promoteAgain.stdout, new RegExp(selectorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectSelector = run(['selector', 'inspect', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectSelector.status, 0, inspectSelector.stderr);
  assert.match(inspectSelector.stdout, /"status": "candidate"/);
  assert.match(inspectSelector.stdout, /"candidate_type": "objective"/);
  assert.match(inspectSelector.stdout, /"boundaries"/);

  const selectorList = run(['selector', 'list'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(selectorList.status, 0, selectorList.stderr);
  assert.match(selectorList.stdout, new RegExp(selectorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = promote.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, promote.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'selector.json')));

  const stateFile = path.join(stateRoot, '.exotic', 'state', 'objectives.json');
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(saved.selectors.length, 1);
});

test('selector materialization persists one new bounded objective', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-materialize-pass-'));
  const createObjective = run([
    'objective',
    'create',
    'Make the scheduler more reliable.',
    '--time-minutes',
    '60'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const sourceObjectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(sourceObjectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    sourceObjectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  const admit = run(['proposal', 'admit', proposalId, '--approver', 'mingo', '--authority', '1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admit.status, 0, admit.stderr);

  const execute = run(['proposal', 'execute', proposalId, '--idempotency-key', 'retry-improvement-1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const promote = run(['lesson', 'promote', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promote.status, 0, promote.stderr);
  const selectorId = promote.stdout.match(/Created selector ([^\r\n]+)/)?.[1];
  assert.ok(selectorId, promote.stdout);

  const materialize = run(['selector', 'materialize', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(materialize.status, 0, materialize.stderr);
  assert.match(materialize.stdout, /Materialized objective /);

  const newObjectiveId = materialize.stdout.match(/Materialized objective ([^\r\n]+)/)?.[1];
  assert.ok(newObjectiveId, materialize.stdout);
  assert.notEqual(newObjectiveId, sourceObjectiveId);

  const materializeAgain = run(['selector', 'materialize', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(materializeAgain.status, 0, materializeAgain.stderr);
  assert.match(materializeAgain.stdout, /Reused objective /);
  assert.match(materializeAgain.stdout, new RegExp(newObjectiveId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectObjective = run(['objective', 'inspect', newObjectiveId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectObjective.status, 0, inspectObjective.stderr);
  assert.match(inspectObjective.stdout, /"status": "defined"/);
  assert.match(inspectObjective.stdout, /"lineage"/);
  assert.match(inspectObjective.stdout, /"selector_id"/);

  const inspectSelector = run(['selector', 'inspect', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectSelector.status, 0, inspectSelector.stderr);
  assert.match(inspectSelector.stdout, /"status": "materialized"/);
  assert.match(inspectSelector.stdout, new RegExp(newObjectiveId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = materialize.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, materialize.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'materialized-objective.json')));

  const stateFile = path.join(stateRoot, '.exotic', 'state', 'objectives.json');
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.ok(saved.objectives.some(item => item.id === newObjectiveId));
});

test('selector can draft one initial proposal for a materialized objective', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-selector-proposal-pass-'));
  const createObjective = run(['objective', 'create', 'Make the scheduler more reliable.', '--time-minutes', '60'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const sourceObjectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(sourceObjectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    sourceObjectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  assert.equal(run(['proposal', 'admit', proposalId, '--approver', 'mingo', '--authority', '1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  }).status, 0);
  const execute = run(['proposal', 'execute', proposalId, '--idempotency-key', 'retry-improvement-1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const promote = run(['lesson', 'promote', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promote.status, 0, promote.stderr);
  const selectorId = promote.stdout.match(/Created selector ([^\r\n]+)/)?.[1];
  assert.ok(selectorId, promote.stdout);

  const draft = run(['selector', 'draft-proposal', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(draft.status, 0, draft.stderr);
  assert.match(draft.stdout, /Drafted proposal /);
  const draftedProposalId = draft.stdout.match(/Drafted proposal ([^\r\n]+)/)?.[1];
  assert.ok(draftedProposalId, draft.stdout);

  const draftAgain = run(['selector', 'draft-proposal', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(draftAgain.status, 0, draftAgain.stderr);
  assert.match(draftAgain.stdout, /Reused proposal /);
  assert.match(draftAgain.stdout, new RegExp(draftedProposalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectProposal = run(['proposal', 'inspect', draftedProposalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectProposal.status, 0, inspectProposal.stderr);
  assert.match(inspectProposal.stdout, /"status": "proposed"/);
  assert.match(inspectProposal.stdout, /"decision_state": "draft"/);

  const inspectSelector = run(['selector', 'inspect', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectSelector.status, 0, inspectSelector.stderr);
  assert.match(inspectSelector.stdout, /"status": "drafted"/);
  assert.match(inspectSelector.stdout, new RegExp(draftedProposalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const bundlePath = draft.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, draft.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'selector-proposal.json')));
});

test('selector can admit its drafted proposal within preserved boundaries', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-selector-admit-pass-'));
  const createObjective = run(['objective', 'create', 'Make the scheduler more reliable.', '--time-minutes', '60'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const sourceObjectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(sourceObjectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    sourceObjectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  assert.equal(run(['proposal', 'admit', proposalId, '--approver', 'mingo', '--authority', '1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  }).status, 0);
  const execute = run(['proposal', 'execute', proposalId, '--idempotency-key', 'retry-improvement-1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const promote = run(['lesson', 'promote', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promote.status, 0, promote.stderr);
  const selectorId = promote.stdout.match(/Created selector ([^\r\n]+)/)?.[1];
  assert.ok(selectorId, promote.stdout);

  const admitSelector = run(['selector', 'admit-proposal', selectorId, '--approver', 'mingo'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admitSelector.status, 0, admitSelector.stderr);
  assert.match(admitSelector.stdout, /Admitted proposal /);
  assert.match(admitSelector.stdout, /Decision: approved/);

  const approvalId = admitSelector.stdout.match(/Admitted proposal ([^\r\n]+)/)?.[1];
  assert.ok(approvalId, admitSelector.stdout);

  const admitAgain = run(['selector', 'admit-proposal', selectorId, '--approver', 'mingo'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(admitAgain.status, 0, admitAgain.stderr);
  assert.match(admitAgain.stdout, /Reused approval /);
  assert.match(admitAgain.stdout, new RegExp(approvalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectApproval = run(['approval', 'inspect', approvalId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectApproval.status, 0, inspectApproval.stderr);
  assert.match(inspectApproval.stdout, /"status": "approved"/);

  const inspectSelector = run(['selector', 'inspect', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectSelector.status, 0, inspectSelector.stderr);
  assert.match(inspectSelector.stdout, /"status": "admitted"/);
  assert.match(inspectSelector.stdout, /"admitted_approval_id"/);

  const bundlePath = admitSelector.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, admitSelector.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'selector-approval.json')));
});

test('selector can execute its admitted proposal through the bounded operation path', () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exotic-selector-execute-pass-'));
  const createObjective = run(['objective', 'create', 'Make the scheduler more reliable.', '--time-minutes', '60'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createObjective.status, 0, createObjective.stderr);
  const sourceObjectiveId = createObjective.stdout.match(/Created objective ([^\r\n]+)/)?.[1];
  assert.ok(sourceObjectiveId, createObjective.stdout);

  const createProposal = run([
    'proposal',
    'create',
    sourceObjectiveId,
    '--time-minutes',
    '30',
    'Inspect scheduler failure points. Implement a targeted retry improvement. Verify stability with focused tests.'
  ], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(createProposal.status, 0, createProposal.stderr);
  const proposalId = createProposal.stdout.match(/Created proposal ([^\r\n]+)/)?.[1];
  assert.ok(proposalId, createProposal.stdout);

  assert.equal(run(['proposal', 'admit', proposalId, '--approver', 'mingo', '--authority', '1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  }).status, 0);
  const execute = run(['proposal', 'execute', proposalId, '--idempotency-key', 'retry-improvement-1'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(execute.status, 0, execute.stderr);
  const operationId = execute.stdout.match(/Created operation ([^\r\n]+)/)?.[1];
  assert.ok(operationId, execute.stdout);

  const learn = run(['operation', 'learn', operationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(learn.status, 0, learn.stderr);
  const lessonId = learn.stdout.match(/Captured lesson ([^\r\n]+)/)?.[1];
  assert.ok(lessonId, learn.stdout);

  const promote = run(['lesson', 'promote', lessonId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(promote.status, 0, promote.stderr);
  const selectorId = promote.stdout.match(/Created selector ([^\r\n]+)/)?.[1];
  assert.ok(selectorId, promote.stdout);

  const executeSelector = run(['selector', 'execute-proposal', selectorId, '--approver', 'mingo'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(executeSelector.status, 0, executeSelector.stderr);
  assert.match(executeSelector.stdout, /Executed proposal /);
  assert.match(executeSelector.stdout, /Verification: passed/);

  const selectorOperationId = executeSelector.stdout.match(/Executed proposal ([^\r\n]+)/)?.[1];
  assert.ok(selectorOperationId, executeSelector.stdout);

  const executeAgain = run(['selector', 'execute-proposal', selectorId, '--approver', 'mingo'], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(executeAgain.status, 0, executeAgain.stderr);
  assert.match(executeAgain.stdout, /Reused operation /);
  assert.match(executeAgain.stdout, new RegExp(selectorOperationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const inspectOperation = run(['operation', 'inspect', selectorOperationId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectOperation.status, 0, inspectOperation.stderr);
  assert.match(inspectOperation.stdout, /"status": "completed"/);
  assert.match(inspectOperation.stdout, /"verification_status": "passed"/);

  const inspectSelector = run(['selector', 'inspect', selectorId], {
    env: { EXOTIC_STATE_ROOT: stateRoot }
  });
  assert.equal(inspectSelector.status, 0, inspectSelector.stderr);
  assert.match(inspectSelector.stdout, /"status": "executed"/);
  assert.match(inspectSelector.stdout, /"executed_operation_id"/);

  const bundlePath = executeSelector.stdout.match(/Bundle: ([^\r\n]+)/)?.[1];
  assert.ok(bundlePath, executeSelector.stdout);
  assert.ok(fs.existsSync(path.join(bundlePath, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'summary.md')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'verification.json')));
  assert.ok(fs.existsSync(path.join(bundlePath, 'artifacts', 'selector-execution.json')));
});
