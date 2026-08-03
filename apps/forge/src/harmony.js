import fs from 'node:fs';
import path from 'node:path';

const LEVEL = { OK: 'ok', WARN: 'warn', ERROR: 'error' };

function finding(level, message) {
  return { level, message };
}

// Mirrors operations-console/scripts/codex-bridge-runtime.mjs's
// matchingTaskId()/recordRoadmapEvidence() lane-matching, so a roadmap step resolves to the
// same task here as it does when the bridge actually records evidence for it.
function matchingTaskId(workspace, step) {
  const lane = String(step.lane || '').toUpperCase();
  const task = (workspace.tasks || []).find((item) => item.taskId.endsWith(`-TASK-${lane}`));
  return task ? task.taskId : null;
}

function checkCompletedStepsHaveEvidence(roadmap, workspace) {
  const findings = [];
  const verifiedTargets = new Set(
    (workspace.evidenceRecords || [])
      .filter((item) => item.verdict === 'verified')
      .map((item) => `${item.relatedEntityType}:${item.relatedEntityId}`)
  );
  for (const step of roadmap) {
    if (step.status !== 'completed') continue;
    const taskId = matchingTaskId(workspace, step);
    const target = taskId ? `task:${taskId}` : `venture:${workspace.venture?.ventureId}`;
    if (!verifiedTargets.has(target)) {
      findings.push(
        finding(
          LEVEL.ERROR,
          `${step.id} is marked completed but has no verified evidence record (expected target ${target}).`
        )
      );
    }
  }
  if (!findings.length) {
    findings.push(finding(LEVEL.OK, 'Every completed roadmap step has verified evidence.'));
  }
  return findings;
}

function expectedTaskStatus(stepStatus) {
  if (stepStatus === 'completed') return 'completed';
  if (stepStatus === 'pending') return 'proposed';
  return 'active';
}

function checkTaskRoadmapDrift(roadmap, workspace) {
  const findings = [];
  for (const step of roadmap) {
    const taskId = matchingTaskId(workspace, step);
    if (!taskId) continue;
    const task = (workspace.tasks || []).find((item) => item.taskId === taskId);
    if (!task) continue;
    const expected = expectedTaskStatus(step.status);
    if (task.status !== expected) {
      findings.push(
        finding(
          LEVEL.WARN,
          `${step.id} is "${step.status}" but its task ${taskId} is "${task.status}" (expected "${expected}").`
        )
      );
    }
  }
  if (!findings.length) {
    findings.push(finding(LEVEL.OK, 'No roadmap/task status drift detected.'));
  }
  return findings;
}

function checkContractValid(workspace, ventureWorkspaceContract) {
  try {
    ventureWorkspaceContract.parse(workspace);
    return [finding(LEVEL.OK, 'venture-workspace.json passes contract validation.')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [finding(LEVEL.ERROR, `venture-workspace.json fails contract validation: ${message}`)];
  }
}

function ventureWorkspaceDir(workspace, workspaceRoot, slugify) {
  const name = workspace?.venture?.name || 'EXOTIC Venture Workspace';
  const ventureId = workspace?.venture?.ventureId || 'V-EXOTIC';
  return path.join(workspaceRoot, `${ventureId.toLowerCase()}-${slugify(name)}`);
}

function checkMaterializedRoadmapFresh(roadmap, workspace, workspaceRoot, slugify) {
  if (!workspaceRoot || !slugify) {
    return [finding(LEVEL.WARN, 'No workspace root configured - skipping materialized-copy freshness check.')];
  }
  const materializedFile = path.join(
    ventureWorkspaceDir(workspace, workspaceRoot, slugify),
    'operations',
    'roadmap.json'
  );
  if (!fs.existsSync(materializedFile)) {
    return [finding(LEVEL.WARN, `No materialized roadmap copy found yet at ${materializedFile}.`)];
  }
  const materialized = JSON.parse(fs.readFileSync(materializedFile, 'utf8'));
  const fresh = JSON.stringify(materialized) === JSON.stringify(roadmap);
  return [
    fresh
      ? finding(LEVEL.OK, 'Materialized roadmap copy matches the live roadmap.')
      : finding(
          LEVEL.WARN,
          `Materialized roadmap copy at ${materializedFile} is stale relative to the live roadmap (a fresh auto-tick or manual update will refresh it).`
        ),
  ];
}

function checkStaleBlockers(roadmap, state) {
  const findings = [];
  const roadmapById = new Map(roadmap.map((step) => [step.id, step]));
  for (const blocker of Array.isArray(state.blockers) ? state.blockers : []) {
    const step = roadmapById.get(blocker.stepId);
    if (!step || step.status !== 'running') {
      findings.push(
        finding(
          LEVEL.WARN,
          `Stale blocker for ${blocker.stepId} (step is now "${step?.status ?? 'unknown'}") - safe to clear.`
        )
      );
    }
  }
  if (!findings.length) {
    findings.push(finding(LEVEL.OK, 'No stale blockers.'));
  }
  return findings;
}

// Cross-state consistency checks between roadmap.json, venture-workspace.json, the
// materialized per-venture workspace copy, and state.json's blockers - the four files the
// bridge runtime treats as separate sources of truth that can drift from each other.
// Dependencies (ventureWorkspaceContract, slugify) are passed in rather than imported here
// so this module stays a plain, independently testable function.
export function runHarmonyCheck({ bridgeRoot, workspaceRoot, ventureWorkspaceContract, slugify }) {
  const roadmapFile = path.join(bridgeRoot, 'roadmap.json');
  const workspaceFile = path.join(bridgeRoot, 'venture-workspace.json');
  const stateFile = path.join(bridgeRoot, 'state.json');

  if (!fs.existsSync(roadmapFile)) {
    return [finding(LEVEL.ERROR, `No roadmap.json found at ${roadmapFile}.`)];
  }
  const roadmap = JSON.parse(fs.readFileSync(roadmapFile, 'utf8'));
  const findings = [];

  if (!fs.existsSync(workspaceFile)) {
    findings.push(
      finding(LEVEL.WARN, `No venture-workspace.json found at ${workspaceFile} - skipping evidence/drift checks.`)
    );
  } else {
    const workspace = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
    if (ventureWorkspaceContract) {
      findings.push(...checkContractValid(workspace, ventureWorkspaceContract));
    }
    findings.push(...checkCompletedStepsHaveEvidence(roadmap, workspace));
    findings.push(...checkTaskRoadmapDrift(roadmap, workspace));
    findings.push(...checkMaterializedRoadmapFresh(roadmap, workspace, workspaceRoot, slugify));
  }

  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    findings.push(...checkStaleBlockers(roadmap, state));
  }

  return findings;
}
