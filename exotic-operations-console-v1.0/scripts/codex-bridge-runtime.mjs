import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  appendEvidenceRecord,
  createVentureWorkspace,
  slugify,
  summarizeWorkspace,
} from "../../packages/entity/dist/index.js";
import { ventureWorkspaceContract } from "../../packages/contracts/dist/index.js";
import { dispatchStep } from "../../packages/codex-worker/dist/index.js";

// Which backend the auto-tick loop dispatches ready steps to. "claude"/"codex" require the
// matching CLI on PATH; "local" requires EXOTIC_LOCAL_MODEL_ENDPOINT. See
// packages/codex-worker/src/backends.ts.
const workerBackendName = process.env.EXOTIC_WORKER_BACKEND || "claude";

const consoleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(consoleRoot, "..");
const dist = path.resolve(
  process.env.EXOTIC_CONSOLE_DIST || path.join(consoleRoot, "dist"),
);
const bridgeRoot = path.resolve(
  process.env.EXOTIC_BRIDGE_ROOT ||
    path.join(repoRoot, ".exotic", "codex-bridge"),
);
const workspaceRoot = path.resolve(
  process.env.EXOTIC_WORKSPACE_ROOT ||
    path.join(repoRoot, ".exotic", "workspaces"),
);
const workspaceFallbackRoot = path.resolve(
  process.env.EXOTIC_WORKSPACE_FALLBACK_ROOT || path.join(dist, "workspaces"),
);
const bridgeStateFile = path.join(bridgeRoot, "state.json");
const roadmapFile = path.join(bridgeRoot, "roadmap.json");
const inboxFile = path.join(bridgeRoot, "inbox.ndjson");
const operatorLog = path.join(bridgeRoot, "operator-notes.md");
const verificationFile = path.join(bridgeRoot, "verification.json");
const bridgeStateFallbackFile = path.join(dist, "bridge-state.json");
const roadmapFallbackFile = path.join(dist, "roadmap.json");
const inboxFallbackFile = path.join(dist, "bridge-inbox.ndjson");
const operatorLogFallbackFile = path.join(dist, "operator-notes.md");
const workspaceFile = path.join(bridgeRoot, "venture-workspace.json");
const workspaceFallbackFile = path.join(
  consoleRoot,
  "dist",
  "venture-workspace.json",
);
const ventureModelSpecFile = path.join(
  repoRoot,
  "docs",
  "VENTURE_MODEL_SPEC.md",
);
const autoModeMasterPlanFile = path.join(
  repoRoot,
  "docs",
  "AUTO_MODE_MASTER_PLAN.md",
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const port = Number(process.env.PORT || 8787);
const host = process.env.EXOTIC_BRIDGE_HOST || "127.0.0.1";
const autoTickMs = Number(process.env.EXOTIC_AUTO_TICK_MS || 300000);
const requestedSwarmConcurrency = Number(
  process.env.EXOTIC_SWARM_CONCURRENCY || 4,
);
const swarmConcurrency = Number.isFinite(requestedSwarmConcurrency)
  ? Math.max(1, Math.min(16, Math.floor(requestedSwarmConcurrency)))
  : 4;

function ensureBridgeFiles() {
  fs.mkdirSync(bridgeRoot, { recursive: true });
  if (!fs.existsSync(roadmapFile)) {
    fs.writeFileSync(
      roadmapFile,
      JSON.stringify(
        [
          {
            id: "P1-01",
            title: "Stabilize the monorepo build",
            summary:
              "Fix the broken top-level TypeScript packages and get the repo back to a clean baseline.",
            priority: "Critical",
            owner: "Codex",
            lane: "foundation",
            dependsOn: [],
            status: "running",
            progress: 25,
          },
          {
            id: "P1-02",
            title: "Define the canonical venture model",
            summary:
              "Create the shared venture/objective/artifact/evidence/workflow schema for all studios.",
            priority: "Critical",
            owner: "Codex",
            lane: "canon",
            dependsOn: ["P1-01"],
            status: "pending",
            progress: 0,
          },
          {
            id: "P1-03",
            title: "Choose the unified workspace shell",
            summary:
              "Pick the main EXOTIC app shell and map studios into one connected environment.",
            priority: "High",
            owner: "Codex",
            lane: "workspace",
            dependsOn: ["P1-02"],
            status: "pending",
            progress: 0,
          },
          {
            id: "P1-04",
            title: "Bootstrap broad request to venture workspace",
            summary:
              "Turn build this business into a generated EXOTIC venture workspace.",
            priority: "High",
            owner: "Codex",
            lane: "workspace",
            dependsOn: ["P1-03"],
            status: "pending",
            progress: 0,
          },
          {
            id: "P1-05",
            title: "Initialize the Ideas studio",
            summary:
              "Materialize the Ideas studio workspace and opportunity framing surface.",
            priority: "High",
            owner: "Codex",
            lane: "ideas",
            dependsOn: ["P1-04"],
            status: "pending",
            progress: 0,
          },
          {
            id: "P1-12",
            title: "Initialize the Research studio",
            summary:
              "Materialize the Research studio workspace and evidence surface.",
            priority: "High",
            owner: "Codex",
            lane: "research",
            dependsOn: ["P1-04"],
            status: "pending",
            progress: 0,
          },
        ],
        null,
        2,
      ),
    );
  }
  if (!fs.existsSync(bridgeStateFile)) {
    fs.writeFileSync(
      bridgeStateFile,
      JSON.stringify(
        {
          title: "Phase 1 foundation",
          summary:
            "Watch EXOTIC become an AI-native venture creation and operations workspace with visible governed execution.",
          nextStep:
            "Stabilize the repo, define the canonical venture model, and connect the studios through one shared workspace system.",
          initialRequest: "build this business",
          updatedAt: new Date().toISOString(),
          lastCodexUpdate: "Bridge initialized. Auto mode is paused - resume it once a worker backend is ready.",
          blockers: [],
          status: "running",
          // Defaults to paused: the auto-tick loop now dispatches real work to a worker
          // backend (see workerBackendName below) instead of just writing an inert prompt,
          // so this is an explicit operator opt-in rather than an inherited "safe by
          // accident" default.
          autoMode: "paused",
        },
        null,
        2,
      ),
    );
  }
  if (!fs.existsSync(inboxFile)) fs.writeFileSync(inboxFile, "");
  ensureWorkspaceFile();
  if (!fs.existsSync(operatorLog)) {
    fs.writeFileSync(
      operatorLog,
      [
        "# EXOTIC Codex Bridge",
        "",
        "This folder is the shared relay between the operations console and Codex work on EXOTIC.",
        "",
        `- State file: \`${bridgeStateFile}\``,
        `- Roadmap file: \`${roadmapFile}\``,
        `- Inbox file: \`${inboxFile}\``,
        "",
        "Add notes from the console or by editing these files directly. Codex can read them on future runs.",
      ].join("\n"),
    );
  }
}

function ensureWorkspaceFile() {
  const state = readBridgeState();
  const primaryWorkspace = parseWorkspace(readJson(workspaceFile, null));
  if (primaryWorkspace) return primaryWorkspace;
  const fallbackWorkspace = parseWorkspace(
    readJson(workspaceFallbackFile, null),
  );
  if (fallbackWorkspace) {
    writeWorkspacePayload(fallbackWorkspace);
    return fallbackWorkspace;
  }
  const workspace = createVentureWorkspace({
    request: state.initialRequest || state.summary || "build this business",
    operator: "wakez",
    ventureName: state.title || "EXOTIC Venture Workspace",
    now: state.updatedAt || new Date().toISOString(),
  });
  writeWorkspacePayload(workspace);
  return workspace;
}

function parseWorkspace(candidate) {
  try {
    return ventureWorkspaceContract.parse(candidate);
  } catch {
    return null;
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readNewestJson(primaryFile, fallbackFile, defaultValue) {
  const candidates = [primaryFile, fallbackFile]
    .filter((file) => fs.existsSync(file))
    .sort(
      (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
    );
  for (const file of candidates) {
    const value = readJson(file, null);
    if (value !== null) return value;
  }
  return defaultValue;
}

function readMessages(limit = 8) {
  const messages = [inboxFile, inboxFallbackFile].flatMap((file) => {
    try {
      return fs
        .readFileSync(file, "utf8")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  });
  return messages
    .sort((left, right) =>
      String(right.timestamp).localeCompare(String(left.timestamp)),
    )
    .slice(0, limit);
}

function readBridgeState() {
  return readNewestJson(bridgeStateFile, bridgeStateFallbackFile, {});
}

function readRoadmap() {
  return readNewestJson(roadmapFile, roadmapFallbackFile, []);
}

function roadmapDependencies(item, index, roadmap) {
  if (Array.isArray(item.dependsOn)) {
    return [...new Set(item.dependsOn.filter((id) => typeof id === "string"))];
  }
  return index > 0 ? [roadmap[index - 1].id] : [];
}

function buildRoadmapProductionFabric(roadmap) {
  const jobs = roadmap.map((item, index) => ({
    id: item.id,
    title: item.title,
    lane: item.lane || "roadmap",
    status: item.status,
    progress: Number(item.progress || 0),
    dependsOn: roadmapDependencies(item, index, roadmap),
    priority: item.priority || "Normal",
  }));
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const invalidDependencies = jobs.flatMap((job) =>
    job.dependsOn
      .filter((dependencyId) => !jobsById.has(dependencyId))
      .map((dependencyId) => ({
        jobId: job.id,
        reason: "unknown-dependency",
        waitingOn: [dependencyId],
      })),
  );
  const blockedIds = new Set(invalidDependencies.map((item) => item.jobId));
  const indegree = new Map(
    jobs.map((job) => [
      job.id,
      job.dependsOn.filter((dependencyId) => jobsById.has(dependencyId)).length,
    ]),
  );
  const dependents = new Map();
  for (const job of jobs) {
    for (const dependencyId of job.dependsOn) {
      if (!jobsById.has(dependencyId)) continue;
      const list = dependents.get(dependencyId) || [];
      list.push(job.id);
      dependents.set(dependencyId, list);
    }
  }
  const queue = jobs.filter((job) => indegree.get(job.id) === 0);
  const ordered = [];
  const layerByJob = new Map();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const job = queue[cursor];
    ordered.push(job);
    const dependencyLayers = job.dependsOn.map(
      (dependencyId) => layerByJob.get(dependencyId) ?? -1,
    );
    layerByJob.set(
      job.id,
      dependencyLayers.length ? Math.max(...dependencyLayers) + 1 : 0,
    );
    for (const dependentId of dependents.get(job.id) || []) {
      const remaining = (indegree.get(dependentId) || 0) - 1;
      indegree.set(dependentId, remaining);
      if (remaining === 0) queue.push(jobsById.get(dependentId));
    }
  }
  const cycleJobs = jobs
    .filter((job) => !ordered.some((candidate) => candidate.id === job.id))
    .map((job) => ({
      jobId: job.id,
      reason: "dependency-cycle",
      waitingOn: job.dependsOn,
    }));
  cycleJobs.forEach((item) => blockedIds.add(item.jobId));
  const dependencyBlocked = [];
  let blockedChanged = true;
  while (blockedChanged) {
    blockedChanged = false;
    for (const job of jobs) {
      if (blockedIds.has(job.id)) continue;
      const waitingOn = job.dependsOn.filter((dependencyId) =>
        blockedIds.has(dependencyId),
      );
      if (!waitingOn.length) continue;
      blockedIds.add(job.id);
      dependencyBlocked.push({
        jobId: job.id,
        reason: "blocked-dependency",
        waitingOn,
      });
      blockedChanged = true;
    }
  }

  const layerGroups = new Map();
  for (const job of ordered.filter((item) => !blockedIds.has(item.id))) {
    const layerIndex = layerByJob.get(job.id) || 0;
    const layerJobs = layerGroups.get(layerIndex) || [];
    layerJobs.push(job);
    layerGroups.set(layerIndex, layerJobs);
  }
  const layers = [...layerGroups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, layerJobs]) => {
      const laneGroups = new Map();
      for (const job of layerJobs) {
        const laneJobs = laneGroups.get(job.lane) || [];
        laneJobs.push(job);
        laneGroups.set(job.lane, laneJobs);
      }
      return {
        id: `roadmap-layer-${index + 1}`,
        index,
        status: layerJobs.every((job) => job.status === "completed")
          ? "completed"
          : layerJobs.some((job) => job.status === "running")
            ? "running"
            : "pending",
        swarms: [...laneGroups.entries()].map(([lane, laneJobs]) => ({
          id: `roadmap-layer-${index + 1}:${lane}`,
          lane,
          cells: laneJobs.map((job) => ({
            id: `${job.id}:cell-1`,
            stepId: job.id,
            title: job.title,
            status: job.status,
            progress: job.progress,
            dependsOn: job.dependsOn,
            evidenceRequired: true,
          })),
        })),
      };
    });
  const completedIds = new Set(
    jobs.filter((job) => job.status === "completed").map((job) => job.id),
  );
  const readyStepIds = jobs
    .filter(
      (job) =>
        job.status === "pending" &&
        !blockedIds.has(job.id) &&
        job.dependsOn.every((dependencyId) => completedIds.has(dependencyId)),
    )
    .map((job) => job.id);
  const activeStepIds = jobs
    .filter((job) => job.status === "running")
    .map((job) => job.id);

  return {
    id: "exotic-roadmap-production-fabric",
    strategy: "dependency-layered-swarms",
    maxConcurrency: swarmConcurrency,
    verificationBarrier: true,
    activeStepIds,
    readyStepIds,
    layers,
    blocked: [...invalidDependencies, ...cycleJobs, ...dependencyBlocked],
    metrics: {
      jobs: jobs.length,
      layers: layers.length,
      swarms: layers.reduce((sum, layer) => sum + layer.swarms.length, 0),
      activeCells: activeStepIds.length,
      readyCells: readyStepIds.length,
    },
  };
}

function writeBridgeState(partial) {
  ensureBridgeFiles();
  const current = readBridgeState();
  const next = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  writeJsonWithFallback(bridgeStateFile, bridgeStateFallbackFile, next);
  return next;
}

function writeRoadmap(items) {
  ensureBridgeFiles();
  writeJsonWithFallback(roadmapFile, roadmapFallbackFile, items);
  return items;
}

function writeJsonWithFallback(primaryFile, fallbackFile, value) {
  const payload = JSON.stringify(value, null, 2);
  try {
    fs.writeFileSync(primaryFile, payload);
    return primaryFile;
  } catch {
    fs.mkdirSync(path.dirname(fallbackFile), { recursive: true });
    fs.writeFileSync(fallbackFile, payload);
    return fallbackFile;
  }
}

function appendTextWithFallback(primaryFile, fallbackFile, value) {
  try {
    fs.appendFileSync(primaryFile, value);
    return primaryFile;
  } catch {
    fs.mkdirSync(path.dirname(fallbackFile), { recursive: true });
    fs.appendFileSync(fallbackFile, value);
    return fallbackFile;
  }
}

function stateStoragePath() {
  return newestExistingPath(bridgeStateFile, bridgeStateFallbackFile);
}

function roadmapStoragePath() {
  return newestExistingPath(roadmapFile, roadmapFallbackFile);
}

function newestExistingPath(primaryFile, fallbackFile) {
  return (
    [primaryFile, fallbackFile]
      .filter((file) => fs.existsSync(file))
      .sort(
        (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
      )[0] || primaryFile
  );
}

function writeWorkspace(workspace) {
  ensureBridgeFiles();
  const validatedWorkspace = ventureWorkspaceContract.parse(workspace);
  writeWorkspacePayload(validatedWorkspace);
  return validatedWorkspace;
}

function writeWorkspacePayload(workspace) {
  const payload = JSON.stringify(workspace, null, 2);
  try {
    fs.writeFileSync(workspaceFile, payload);
    return workspaceFile;
  } catch {
    fs.mkdirSync(path.dirname(workspaceFallbackFile), { recursive: true });
    fs.writeFileSync(workspaceFallbackFile, payload);
    return workspaceFallbackFile;
  }
}

function workspaceStoragePath() {
  return fs.existsSync(workspaceFile) ? workspaceFile : workspaceFallbackFile;
}

function syncWorkspaceState({ state, roadmap }) {
  const workspace =
    ensureWorkspaceFile() ||
    createVentureWorkspace({
      request: state.initialRequest || state.summary || "build this business",
      operator: "wakez",
      ventureName: state.title || "EXOTIC Venture Workspace",
      now: state.updatedAt || new Date().toISOString(),
    });
  const runningCount = roadmap.filter(
    (item) => item.status === "running",
  ).length;
  const completedCount = roadmap.filter(
    (item) => item.status === "completed",
  ).length;
  const pendingCount = roadmap.filter(
    (item) => item.status === "pending",
  ).length;

  const lifecycleCollections = [
    ["venture", [workspace.venture]],
    ["objective", workspace.objectives],
    ["studio-scope", workspace.studioScopes],
    ["workflow", workspace.workflows],
    ["task", workspace.tasks],
    ["artifact", workspace.artifacts],
    ["decision", workspace.decisions],
    ["approval", workspace.approvals],
    ["resource", workspace.resources],
  ];
  const verifiedEvidence = new Set(
    (workspace.evidenceRecords || [])
      .filter((item) => item.verdict === "verified")
      .map((item) => `${item.relatedEntityType}:${item.relatedEntityId}`),
  );
  const completionTargets = lifecycleCollections.flatMap(
    ([entityType, records]) =>
      (records || [])
        .filter((item) => item?.status === "completed")
        .map((item) => `${entityType}:${entityIdentifier(entityType, item)}`),
  );
  const evidenceCoverage = completionTargets.length
    ? Math.round(
        (completionTargets.filter((target) => verifiedEvidence.has(target))
          .length /
          completionTargets.length) *
          100,
      )
    : 100;

  workspace.metrics = (workspace.metrics || []).map((metric) => {
    if (metric.name === "Workspace coverage") {
      const outputCount = new Set(
        (workspace.outputManifest || []).map((item) => item.output),
      ).size;
      return {
        ...metric,
        currentValue: Math.min(100, Math.round((outputCount / 13) * 100)),
        updatedAt: new Date().toISOString(),
      };
    }
    if (metric.name === "Evidence coverage") {
      return {
        ...metric,
        currentValue: evidenceCoverage,
        updatedAt: new Date().toISOString(),
      };
    }
    return metric;
  });

  const runtimeSummary = `Roadmap: ${completedCount} completed / ${runningCount} running / ${pendingCount} pending. Auto mode ${state.autoMode === "paused" ? "paused" : "running"}.`;
  const ventureId = workspace.venture?.ventureId || "V-EXOTIC";
  const memoryRecord = {
    memoryId: `${ventureId}-MEM-RUNTIME-SUMMARY`,
    ventureId,
    kind: "runtime-summary",
    summary: runtimeSummary,
    source: "codex-bridge-runtime",
    createdAt: new Date().toISOString(),
    relevanceTags: ["runtime", "roadmap", "auto-mode"],
  };
  workspace.memoryRecords = Array.isArray(workspace.memoryRecords)
    ? [
        ...workspace.memoryRecords.filter(
          (item) => item.memoryId !== memoryRecord.memoryId,
        ),
        memoryRecord,
      ]
    : [memoryRecord];

  const runtimeMemoryEdge = {
    edgeId: `${ventureId}-EDGE-RUNTIME-MEMORY`,
    ventureId,
    fromEntityType: "memory-record",
    fromEntityId: memoryRecord.memoryId,
    relation: "remembers",
    toEntityType: "venture",
    toEntityId: ventureId,
    createdAt: memoryRecord.createdAt,
  };
  workspace.graphEdges = Array.isArray(workspace.graphEdges)
    ? [
        ...workspace.graphEdges.filter(
          (item) => item.edgeId !== runtimeMemoryEdge.edgeId,
        ),
        runtimeMemoryEdge,
      ]
    : [runtimeMemoryEdge];

  workspace.tasks = Array.isArray(workspace.tasks)
    ? workspace.tasks.map((task, index) => {
        const step = roadmap[index];
        if (!step) return task;
        const hasVerifiedEvidence = verifiedEvidence.has(`task:${task.taskId}`);
        const status =
          step.status === "pending"
            ? "proposed"
            : step.status === "completed" && hasVerifiedEvidence
              ? "completed"
              : "active";
        return {
          ...task,
          status,
          updatedAt: new Date().toISOString(),
        };
      })
    : workspace.tasks;

  materializeWorkspace(workspace, roadmap, state);
  return writeWorkspace(workspace);
}

function entityIdentifier(entityType, entity) {
  const fields = {
    venture: "ventureId",
    objective: "objectiveId",
    "studio-scope": "studioScopeId",
    workflow: "workflowId",
    task: "taskId",
    artifact: "artifactId",
    decision: "decisionId",
    approval: "approvalId",
    resource: "resourceId",
  };
  return entity?.[fields[entityType]] || "";
}

function ventureWorkspaceDirectory(workspace) {
  const name = workspace?.venture?.name || "EXOTIC Venture Workspace";
  const ventureId = workspace?.venture?.ventureId || "V-EXOTIC";
  return path.join(
    activeWorkspaceRoot(),
    `${ventureId.toLowerCase()}-${slugify(name)}`,
  );
}

function activeWorkspaceRoot() {
  try {
    fs.mkdirSync(workspaceRoot, { recursive: true });
    return workspaceRoot;
  } catch {
    fs.mkdirSync(workspaceFallbackRoot, { recursive: true });
    return workspaceFallbackRoot;
  }
}

function contentionFallbackPath(target) {
  const extension = path.extname(target);
  const stem = extension ? target.slice(0, -extension.length) : target;
  return `${stem}.pending-${process.pid}${extension}`;
}

function isFileContention(error) {
  return ["EACCES", "EBUSY", "EPERM"].includes(error?.code);
}

function preserveContendedWrite(target, content, append, error) {
  if (!isFileContention(error)) throw error;
  const fallback = contentionFallbackPath(target);
  try {
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    if (append) fs.appendFileSync(fallback, content, "utf8");
    else fs.writeFileSync(fallback, content, "utf8");
    console.warn(
      `Workspace file was busy; preserved pending content at ${fallback}`,
    );
    return fallback;
  } catch (fallbackError) {
    if (!isFileContention(fallbackError)) throw fallbackError;
    console.warn(`Workspace file remained busy; skipped ${target}`);
    return null;
  }
}

function writeTextFile(target, content) {
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return target;
  } catch (error) {
    return preserveContendedWrite(target, content, false, error);
  }
}

function appendTextFile(target, content) {
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, content, "utf8");
    return target;
  } catch (error) {
    return preserveContendedWrite(target, content, true, error);
  }
}

function studioArtifactBody(
  studio,
  workspace,
  roadmap,
  matchingTask,
  matchingArtifact,
) {
  const ventureName = workspace?.venture?.name || "EXOTIC Venture Workspace";
  return [
    `# ${ventureName} ${studio.replace(/(^|-)([a-z])/g, (_, a, b) => `${a}${b.toUpperCase()}`)} Studio`,
    "",
    `Status: ${matchingTask?.status || "proposed"}`,
    `Artifact Type: ${matchingArtifact?.artifactType || "unknown"}`,
    "",
    "## Purpose",
    matchingTask?.title || `Initialize ${studio} studio execution.`,
    "",
    "## Current Direction",
    matchingTask?.completionCriteria?.map((item) => `- ${item}`).join("\n") ||
      "- Define the initial operating surface.",
    "",
    "## Roadmap Context",
    roadmap
      .map(
        (item) =>
          `- ${item.id}: ${item.title} (${item.status}, ${item.progress}%)`,
      )
      .join("\n"),
    "",
    "## Notes",
    "This file is materialized by the EXOTIC bridge runtime so autonomous progress leaves real artifacts behind.",
  ].join("\n");
}

function materializeWorkspace(workspace, roadmap, state) {
  const root = ventureWorkspaceDirectory(workspace);
  const studiosDir = path.join(root, "studios");
  const evidenceDir = path.join(root, "evidence");
  const opsDir = path.join(root, "operations");

  fs.mkdirSync(studiosDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(opsDir, { recursive: true });

  writeTextFile(
    path.join(root, "README.md"),
    [
      `# ${workspace.venture.name}`,
      "",
      `Type: ${workspace.venture.type}`,
      `Status: ${workspace.venture.status}`,
      `Operator: ${workspace.venture.operator}`,
      "",
      "## Thesis",
      workspace.venture.thesis,
      "",
      "## Workspace Summary",
      summarizeWorkspace(workspace),
      "",
      "## Objectives",
      workspace.objectives
        .map((item) => `- ${item.title}: ${item.summary}`)
        .join("\n"),
      "",
      "## Auto Mode",
      state.autoMode === "paused" ? "Paused" : "Running",
    ].join("\n"),
  );

  writeTextFile(
    path.join(opsDir, "venture-workspace.json"),
    JSON.stringify(workspace, null, 2),
  );
  writeTextFile(
    path.join(opsDir, "roadmap.json"),
    JSON.stringify(roadmap, null, 2),
  );
  writeTextFile(
    path.join(opsDir, "state.json"),
    JSON.stringify(state, null, 2),
  );

  for (const scope of workspace.studioScopes || []) {
    const matchingTask = (workspace.tasks || []).find(
      (task) => task.taskId === `TASK-${scope.studio.toUpperCase()}`,
    );
    const matchingArtifact = (workspace.artifacts || []).find(
      (artifact) => artifact.artifactId === `ART-${scope.studio.toUpperCase()}`,
    );
    const studioDir = path.join(studiosDir, scope.studio);
    const studioFile = path.join(studioDir, "workspace.md");
    writeTextFile(
      studioFile,
      studioArtifactBody(
        scope.studio,
        workspace,
        roadmap,
        matchingTask,
        matchingArtifact,
      ),
    );
  }

  writeTextFile(
    path.join(evidenceDir, "current-state.md"),
    [
      "# Current Execution State",
      "",
      `Updated: ${new Date().toISOString()}`,
      `Auto mode: ${state.autoMode === "paused" ? "paused" : "running"}`,
      `Summary: ${summarizeWorkspace(workspace)}`,
      "",
      "## Roadmap",
      roadmap
        .map(
          (item) =>
            `- ${item.id} ${item.title}: ${item.status} ${item.progress}%`,
        )
        .join("\n"),
    ].join("\n"),
  );
}

function appendExecutionEvidence(roadmap, state, activeStep) {
  const workspace = ensureWorkspaceFile();
  const evidenceDir = path.join(
    ventureWorkspaceDirectory(workspace),
    "evidence",
  );
  const evidenceLog = path.join(evidenceDir, "auto-execution-log.md");
  if (!fs.existsSync(evidenceLog)) {
    writeTextFile(evidenceLog, "# Auto Execution Log\n");
  }
  appendTextFile(
    evidenceLog,
    `\n## ${new Date().toISOString()}\n- Auto mode: ${state.autoMode === "paused" ? "paused" : "running"}\n- Active step: ${activeStep.id} ${activeStep.status} ${activeStep.progress}%\n- Roadmap: ${roadmap.map((item) => `${item.id} ${item.status} ${item.progress}%`).join(" | ")}\n`,
  );
}

function gitSummary() {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const statusOutput = execFileSync("git", ["status", "--short"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    const lines = statusOutput
      ? statusOutput.split(/\r?\n/).filter(Boolean)
      : [];
    const untrackedFiles = lines.filter((line) => line.startsWith("??")).length;
    const changedFiles = lines.length - untrackedFiles;
    const summary = !lines.length
      ? "Clean working tree."
      : `${changedFiles} changed / ${untrackedFiles} untracked files.`;
    const paths = lines.map((line) => line.slice(3).trim()).filter(Boolean);
    const topDirectories = {};
    for (const file of paths) {
      const normalized = file.replace(/\\/g, "/");
      const top = normalized.includes("/")
        ? normalized.split("/")[0]
        : "(root)";
      topDirectories[top] = (topDirectories[top] || 0) + 1;
    }
    const directoryBreakdown = Object.entries(topDirectories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
    return {
      branch,
      changedFiles,
      untrackedFiles,
      summary,
      pathsSample: paths.slice(0, 10),
      directoryBreakdown,
    };
  } catch (error) {
    return {
      branch: "git unavailable",
      changedFiles: 0,
      untrackedFiles: 0,
      summary: `Git scan failed: ${error.message}`,
      pathsSample: [],
      directoryBreakdown: [],
    };
  }
}

function uptime() {
  const seconds = Math.max(1, Math.floor(process.uptime()));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function statusFromHealth(health) {
  if (health >= 90) return "healthy";
  if (health >= 70) return "warning";
  return "critical";
}

function lifecycleStatus(progress) {
  if (progress >= 100) return "completed";
  if (progress > 0) return "running";
  return "pending";
}

function ecosystemProfiles() {
  return {
    "venture-orchestrator": {
      professionalStandard:
        "An operator should understand how a raw intent becomes a structured venture with goals, plans, assets, execution, evidence, and measured outcomes.",
      responsibilities: [
        "Interpret broad user requests into concrete venture scopes.",
        "Create coherent objectives across all studios.",
        "Maintain alignment between strategy, execution, and results.",
      ],
      inputs: [
        "Operator brief",
        "Research context",
        "Graph entities",
        "Studio capabilities",
      ],
      outputs: [
        "Generated venture workspace",
        "Objectives",
        "Studio tasks",
        "Evidence-linked deliverables",
      ],
      failureModes: [
        "Creates disconnected outputs",
        "Generates plans without execution hooks",
        "Loses alignment between intent and implementation",
      ],
      completionCriteria: [
        "One request reliably generates a full connected workspace",
        "Studios receive synchronized objectives",
        "Outputs stay traceable to source intent",
      ],
      operatorQuestions: [
        "What is the target venture?",
        "What are the non-negotiable outcomes?",
        "Which studios must activate first?",
      ],
      maturity:
        "Foundational concept defined, orchestration engine not yet complete.",
    },
    "universal-graph": {
      professionalStandard:
        "A professional should know the system of record: what entities exist, how they relate, and which workflows can mutate them.",
      responsibilities: [
        "Define canonical venture entities and relationships.",
        "Provide one shared substrate for all studios.",
        "Prevent duplicated or conflicting state across the platform.",
      ],
      inputs: [
        "Venture objects",
        "Objectives",
        "Artifacts",
        "Evidence",
        "Workflows",
      ],
      outputs: [
        "Canonical graph schema",
        "Studio contracts",
        "Shared IDs and relations",
      ],
      failureModes: [
        "Studios drift into separate data models",
        "Artifacts cannot be traced to goals",
        "Automation has no canonical state",
      ],
      completionCriteria: [
        "Entity schema is documented",
        "Read/write rules exist per studio",
        "Every artifact can link back to venture objectives",
      ],
      operatorQuestions: [
        "What are the core entity types?",
        "What is authoritative state?",
        "How do studios read and write shared objects?",
      ],
      maturity: "Critical roadmap item, schema not yet implemented.",
    },
    "memory-system": {
      professionalStandard:
        "A professional should see how EXOTIC preserves context over time and prevents repeated rediscovery.",
      responsibilities: [
        "Retain decisions, notes, state transitions, and supporting evidence.",
        "Make historical context retrievable during future work runs.",
        "Preserve continuity between operator direction and autonomous execution.",
      ],
      inputs: [
        "Bridge state",
        "Operator notes",
        "Research outputs",
        "Execution history",
      ],
      outputs: [
        "Persistent memory records",
        "Retrieved context",
        "Decision continuity",
      ],
      failureModes: [
        "Context loss between sessions",
        "Repeated planning work",
        "Important decisions not reused",
      ],
      completionCriteria: [
        "Memory persists across runs",
        "Context retrieval is structured",
        "Notes connect to artifacts and roadmap state",
      ],
      operatorQuestions: [
        "What must never be forgotten?",
        "How is prior work surfaced?",
        "Which memories are actionable versus archival?",
      ],
      maturity:
        "Filesystem persistence exists, structured memory remains incomplete.",
    },
    "agent-runtime": {
      professionalStandard:
        "A professional should understand how tasks are executed, supervised, paused, resumed, and observed.",
      responsibilities: [
        "Coordinate tool use and execution loops.",
        "Expose runtime control to the operator.",
        "Respect automation state and execution boundaries.",
      ],
      inputs: [
        "Roadmap tasks",
        "Bridge state",
        "Operator actions",
        "Repo context",
      ],
      outputs: [
        "Runtime snapshots",
        "Task execution",
        "Automation state transitions",
      ],
      failureModes: [
        "Runs without supervision boundaries",
        "Ignores paused state",
        "Executes without usable observability",
      ],
      completionCriteria: [
        "Runtime state is visible",
        "Pause/resume is respected by execution",
        "Scheduled work can advance predictably",
      ],
      operatorQuestions: [
        "What is running now?",
        "What can the runtime do autonomously?",
        "What stops execution?",
      ],
      maturity:
        "Bridge runtime exists with control surface; deeper task automation still needs wiring.",
    },
    "authority-system": {
      professionalStandard:
        "A professional should know exactly what EXOTIC is allowed to decide alone and what requires explicit approval.",
      responsibilities: [
        "Define decision boundaries.",
        "Separate autonomous actions from approval-gated actions.",
        "Protect serious business operations from uncontrolled execution.",
      ],
      inputs: ["Policies", "Operator roles", "Task classes", "Risk thresholds"],
      outputs: ["Approval rules", "Execution permissions", "Governance state"],
      failureModes: [
        "Unsafe autonomous actions",
        "Ambiguous approval requirements",
        "No enforceable governance layer",
      ],
      completionCriteria: [
        "Clear approval policy exists",
        "High-risk actions are gated",
        "Operator can inspect authority boundaries",
      ],
      operatorQuestions: [
        "What can EXOTIC do without asking?",
        "What must pause for approval?",
        "How are authority changes tracked?",
      ],
      maturity: "Concept exists, formal policy model still missing.",
    },
    "artifact-evidence": {
      professionalStandard:
        "A professional should be able to inspect any output and see proof of what it is, why it exists, and how it was verified.",
      responsibilities: [
        "Link outputs to source goals and evidence.",
        "Preserve verification trails.",
        "Make progress measurable through artifacts rather than claims.",
      ],
      inputs: ["Code", "Designs", "Research", "Metrics", "Audit events"],
      outputs: [
        "Evidence-linked artifacts",
        "Verification traces",
        "Operational proof",
      ],
      failureModes: [
        "Claims without proof",
        "Outputs disconnected from goals",
        "No verifiable completion logic",
      ],
      completionCriteria: [
        "Artifacts link to objectives",
        "Verification data is visible",
        "Evidence can be audited",
      ],
      operatorQuestions: [
        "What proves this is done?",
        "Which artifact supports this claim?",
        "Where is the audit trail?",
      ],
      maturity:
        "Partial through audit and repo visibility; not yet full-spectrum.",
    },
    "ideas-studio": {
      professionalStandard:
        "A professional should know how opportunities are captured, evaluated, and promoted into ventures.",
      responsibilities: [
        "Capture opportunities",
        "Shape concepts",
        "Convert ideas into venture candidates",
      ],
      inputs: ["Prompts", "Problems", "Market signals", "Operator ideas"],
      outputs: [
        "Idea records",
        "Opportunity scores",
        "Promoted venture concepts",
      ],
      failureModes: [
        "Ideas remain vague",
        "No prioritization logic",
        "Good concepts never enter execution",
      ],
      completionCriteria: [
        "Idea intake exists",
        "Scoring logic exists",
        "Ideas can become venture objects",
      ],
      operatorQuestions: [
        "What makes an idea worth building?",
        "How are ideas ranked?",
        "When does an idea become a venture?",
      ],
      maturity: "Defined conceptually; no studio workflow yet.",
    },
    "business-studio": {
      professionalStandard:
        "A professional should understand the business case, assumptions, goals, economics, and approval logic for each venture.",
      responsibilities: [
        "Model the business",
        "Set targets and assumptions",
        "Frame launch and operating plans",
      ],
      inputs: [
        "Market context",
        "Goals",
        "Cost assumptions",
        "Operator constraints",
      ],
      outputs: [
        "Business strategy",
        "Assumption sets",
        "Operating plans",
        "Approval-ready decisions",
      ],
      failureModes: [
        "Strategy remains cosmetic",
        "No measurable business logic",
        "Plans are detached from execution reality",
      ],
      completionCriteria: [
        "Goals are explicit",
        "Assumptions are documented",
        "Business logic connects to product and operations",
      ],
      operatorQuestions: [
        "What value is being created?",
        "What assumptions matter most?",
        "What must be approved before launch?",
      ],
      maturity:
        "Serious framing restored; structured business workspace still missing.",
    },
    "product-studio": {
      professionalStandard:
        "A professional should know how strategy becomes requirements, milestones, releases, and execution sequences.",
      responsibilities: [
        "Translate goals into product scope",
        "Define requirements",
        "Sequence delivery",
      ],
      inputs: [
        "Business goals",
        "User needs",
        "Technical constraints",
        "Roadmap priorities",
      ],
      outputs: [
        "Requirements",
        "Milestones",
        "Release plans",
        "Task sequences",
      ],
      failureModes: [
        "No clear requirements",
        "Roadmaps without downstream execution",
        "Scope drift",
      ],
      completionCriteria: [
        "Requirements are documented",
        "Milestones are linked to execution",
        "Releases have verification criteria",
      ],
      operatorQuestions: [
        "What exactly is being built?",
        "What is in or out of scope?",
        "How is delivery sequenced?",
      ],
      maturity:
        "Roadmap visibility exists; full product operating layer not yet built.",
    },
    "design-studio": {
      professionalStandard:
        "A professional should understand brand system, interaction standards, interface principles, and visual continuity across EXOTIC.",
      responsibilities: [
        "Define visual language",
        "Shape interfaces",
        "Maintain UX coherence",
      ],
      inputs: [
        "Brand direction",
        "Product flows",
        "Content needs",
        "Operational priorities",
      ],
      outputs: ["Design systems", "Screens", "Motion rules", "Brand assets"],
      failureModes: [
        "Inconsistent surfaces",
        "Low trust visual language",
        "No reusable design system",
      ],
      completionCriteria: [
        "Shared design language exists",
        "Interfaces follow clear patterns",
        "Brand system scales across studios",
      ],
      operatorQuestions: [
        "What should EXOTIC feel like?",
        "What design rules are reusable?",
        "How do surfaces stay coherent?",
      ],
      maturity:
        "Console redesign proves direction; broader system still to be extended.",
    },
    "website-studio": {
      professionalStandard:
        "A professional should know how EXOTIC produces public-facing web surfaces and how those relate to internal venture state.",
      responsibilities: [
        "Generate web surfaces",
        "Support publishing",
        "Connect content to ventures",
      ],
      inputs: [
        "Design assets",
        "Product content",
        "Brand rules",
        "Deployment targets",
      ],
      outputs: ["Sites", "Landing pages", "Public experiences"],
      failureModes: [
        "Web output detached from core venture state",
        "No deployment path",
        "Inconsistent messaging",
      ],
      completionCriteria: [
        "Web generation exists",
        "Deployable outputs are real",
        "Public surfaces are traceable to venture state",
      ],
      operatorQuestions: [
        "What public surface needs to exist?",
        "How is it generated?",
        "How does it stay aligned with the venture?",
      ],
      maturity:
        "Local console proves browser surface capability; full website studio still pending.",
    },
    "development-studio": {
      professionalStandard:
        "A professional should understand how code moves from task intent to repo changes, verification, and release readiness.",
      responsibilities: [
        "Implement code changes",
        "Manage repo state",
        "Run tests and packaging flows",
      ],
      inputs: [
        "Tasks",
        "Repo context",
        "Runtime execution",
        "Verification rules",
      ],
      outputs: [
        "Code changes",
        "Build artifacts",
        "Tests",
        "Release-ready implementations",
      ],
      failureModes: [
        "Repo instability",
        "Changes without verification",
        "Execution loops that cannot finish",
      ],
      completionCriteria: [
        "Build is stable",
        "Implementation loops are repeatable",
        "Verification is visible",
      ],
      operatorQuestions: [
        "What is changing in the repo?",
        "Is the build stable?",
        "How is code verified?",
      ],
      maturity:
        "Observer can see repo state; implementation system still maturing.",
    },
    "marketing-studio": {
      professionalStandard:
        "A professional should understand how positioning, campaigns, and feedback loops operate as part of venture execution.",
      responsibilities: [
        "Define messaging",
        "Plan campaigns",
        "Link outreach to outcomes",
      ],
      inputs: [
        "Business strategy",
        "Brand language",
        "Audience targets",
        "Launch milestones",
      ],
      outputs: ["Campaign plans", "Messaging assets", "Growth experiments"],
      failureModes: [
        "No launch narrative",
        "No measurable feedback loop",
        "Marketing detached from product reality",
      ],
      completionCriteria: [
        "Messaging system exists",
        "Campaign workflows are repeatable",
        "Results feed back into strategy",
      ],
      operatorQuestions: [
        "Who is being reached?",
        "What message is being tested?",
        "How are outcomes measured?",
      ],
      maturity: "Defined but not yet implemented.",
    },
    "research-studio": {
      professionalStandard:
        "A professional should know how evidence is gathered, evaluated, and converted into decision-quality insight.",
      responsibilities: [
        "Collect sources",
        "Synthesize findings",
        "Support decisions with evidence",
      ],
      inputs: [
        "Questions",
        "Sources",
        "Competitive data",
        "Operator research tasks",
      ],
      outputs: [
        "Research briefs",
        "Evidence summaries",
        "Decision support artifacts",
      ],
      failureModes: [
        "Unsourced claims",
        "Research not linked to decisions",
        "Insights not reusable",
      ],
      completionCriteria: [
        "Source capture exists",
        "Research outputs are structured",
        "Evidence attaches to venture decisions",
      ],
      operatorQuestions: [
        "What do we know?",
        "What remains uncertain?",
        "Which sources support the conclusion?",
      ],
      maturity:
        "Concept included in the system definition; workflow still missing.",
    },
    "workflows-studio": {
      professionalStandard:
        "A professional should understand how repeatable operating routines are designed, triggered, supervised, and improved.",
      responsibilities: [
        "Define recurring flows",
        "Sequence automation chains",
        "Coordinate cross-studio routines",
      ],
      inputs: ["Plans", "Triggers", "Runtime permissions", "Task dependencies"],
      outputs: ["Workflow definitions", "Queues", "Recurring routines"],
      failureModes: [
        "Automation without structure",
        "Routines that ignore dependencies",
        "No observable workflow state",
      ],
      completionCriteria: [
        "Workflows are explicit",
        "Triggers and guards exist",
        "Execution state is visible",
      ],
      operatorQuestions: [
        "What routine should repeat?",
        "What triggers it?",
        "What stops or retries it?",
      ],
      maturity: "Auto mode controls exist; full workflow engine still pending.",
    },
    "operations-studio": {
      professionalStandard:
        "A professional should understand how the business is supervised day to day: priorities, blockers, health, execution state, and operator intervention.",
      responsibilities: [
        "Track health",
        "Surface blockers",
        "Control execution and priorities",
      ],
      inputs: [
        "Runtime state",
        "Roadmap status",
        "Repo context",
        "Operator actions",
      ],
      outputs: [
        "Operational dashboards",
        "Run-state controls",
        "Priority visibility",
      ],
      failureModes: [
        "No clear source of truth for status",
        "No intervention surface",
        "Operational ambiguity",
      ],
      completionCriteria: [
        "Runtime is observable",
        "Blockers are visible",
        "Operator controls are direct and usable",
      ],
      operatorQuestions: [
        "What is happening right now?",
        "What is stuck?",
        "Where should attention go next?",
      ],
      maturity: "Strongest current studio slice.",
    },
    "operations-console": {
      professionalStandard:
        "A professional should be able to sit down at this console and understand the system without needing hidden context.",
      responsibilities: [
        "Present state clearly",
        "Support intervention",
        "Expose structure and progress",
      ],
      inputs: [
        "Bridge snapshot",
        "Repo state",
        "Roadmap state",
        "Operator controls",
      ],
      outputs: [
        "Interactive observer",
        "Control surface",
        "System comprehension",
      ],
      failureModes: [
        "Dashboard theater",
        "Status without meaning",
        "Controls without trustworthy backing",
      ],
      completionCriteria: [
        "Views are actionable",
        "State is live",
        "System structure is understandable to a serious operator",
      ],
      operatorQuestions: [
        "What is complete?",
        "What is missing?",
        "What action can I take now?",
      ],
      maturity: "Operationally useful and expanding into a real control plane.",
    },
    "analytics-observability": {
      professionalStandard:
        "A professional should understand how EXOTIC measures health, progress, verification, and output quality over time.",
      responsibilities: [
        "Measure progress",
        "Expose verification state",
        "Show historical and current health",
      ],
      inputs: [
        "Audit events",
        "Repo signals",
        "Runtime data",
        "Artifact verification results",
      ],
      outputs: [
        "KPIs",
        "Health indicators",
        "Trend views",
        "Verification summaries",
      ],
      failureModes: [
        "No trustworthy metrics",
        "No historical trend visibility",
        "Cannot distinguish real progress from activity",
      ],
      completionCriteria: [
        "Core metrics exist",
        "Historical visibility exists",
        "Completion has measurable evidence",
      ],
      operatorQuestions: [
        "How healthy is the machine?",
        "Is work progressing?",
        "What metrics actually matter?",
      ],
      maturity:
        "Strong start through health and audit views; still incomplete.",
    },
    "venture-workspace": {
      professionalStandard:
        "A professional should understand the concrete end product of EXOTIC: the editable workspace generated from a request.",
      responsibilities: [
        "Contain connected venture work",
        "Expose cross-studio outputs",
        "Act as the main environment for operating the venture",
      ],
      inputs: ["Venture orchestration", "Studio outputs", "Shared graph state"],
      outputs: [
        "Research",
        "Strategy",
        "Design",
        "Code",
        "Operations state",
        "Evidence",
      ],
      failureModes: [
        "Generated workspace is shallow",
        "Outputs are disconnected",
        "User receives plans without editable implementation",
      ],
      completionCriteria: [
        "Broad requests generate real workspaces",
        "Artifacts are editable",
        "All studios connect through one surface",
      ],
      operatorQuestions: [
        "What should be generated from a request?",
        "What must be editable?",
        "How do all studios converge here?",
      ],
      maturity: "Target outcome clearly defined; generator not yet complete.",
    },
    "studios-shell": {
      professionalStandard:
        "A professional should know how every studio appears as a connected view over one underlying system rather than separate apps.",
      responsibilities: [
        "Provide unified navigation",
        "Preserve shared state across studios",
        "Keep context portable between views",
      ],
      inputs: [
        "Graph state",
        "Studio modules",
        "Operator context",
        "Execution state",
      ],
      outputs: [
        "Unified UI shell",
        "Connected studio views",
        "Cross-studio continuity",
      ],
      failureModes: [
        "Studios feel like separate tools",
        "Context is lost when switching views",
        "No common shell architecture",
      ],
      completionCriteria: [
        "Single shell exists",
        "Studios share state",
        "Operators can move across functions without losing context",
      ],
      operatorQuestions: [
        "How do studios connect?",
        "What state remains shared?",
        "What is the canonical shell experience?",
      ],
      maturity:
        "Requirement is defined; shell architecture remains a major build area.",
    },
  };
}

function buildBoard(state) {
  return {
    summary:
      "The board governs strategic direction, capital discipline, autonomous authority boundaries, operating cadence, and venture readiness for EXOTIC.",
    cadence: "Weekly founder review, monthly board review",
    nextReview: "July 31, 2026",
    focusAreas: [
      "Product system integrity",
      "Autonomy and approval boundaries",
      "Capital efficiency and resource discipline",
      "Execution velocity toward first serious release",
    ],
    members: [
      {
        name: "Founder and Chief Executive",
        role: "Chair",
        status: "running",
        oversight: ["Strategy", "Capital allocation", "Operating priorities"],
        summary:
          "Owns final company direction, product ambition, and board-level prioritization.",
      },
      {
        name: "Codex Operating Partner",
        role: "Execution advisor",
        status: "running",
        oversight: [
          "Delivery planning",
          "Runtime execution",
          "System integration",
        ],
        summary:
          "Translates board direction into build structure, execution loops, and measurable progress.",
      },
      {
        name: "Governance and Risk Seat",
        role: "Control authority",
        status: "pending",
        oversight: ["Approvals", "Autonomy rules", "Operational safeguards"],
        summary:
          "Defines what EXOTIC may do autonomously and what requires explicit operator approval.",
      },
    ],
    agenda: [
      {
        title: "Stabilize the foundational build surface",
        summary:
          "Reduce system ambiguity by stabilizing the monorepo and making the current runtime surface dependable.",
        owner: "Chair",
        timing: "Immediate",
        status: "running",
      },
      {
        title: "Approve the canonical venture graph",
        summary:
          "Board-level confirmation of the core entity model before deeper studio execution is allowed to scale.",
        owner: "Governance seat",
        timing: "Current cycle",
        status: "pending",
      },
      {
        title: "Authorize serious autonomous operating rules",
        summary:
          "Define the threshold between observation, suggestion, execution, and approval-gated actions.",
        owner: "Chair",
        timing: "Current cycle",
        status: state.autoMode === "running" ? "running" : "pending",
      },
    ],
    decisions: [
      {
        domain: "Strategic Direction",
        scope:
          "Approves major product direction, platform posture, and venture model changes.",
        triggers: [
          "Platform repositioning",
          "Studio structure changes",
          "Major roadmap reset",
        ],
      },
      {
        domain: "Autonomous Authority",
        scope:
          "Approves or restricts what EXOTIC may execute without direct operator confirmation.",
        triggers: [
          "New workflow autonomy",
          "External actions",
          "Irreversible system changes",
        ],
      },
      {
        domain: "Capital and Resource Use",
        scope:
          "Reviews any serious resource commitment, infrastructure expansion, or spend-related operating decision.",
        triggers: [
          "Paid tooling",
          "Infrastructure commitments",
          "Material operating cost",
        ],
      },
      {
        domain: "Release Readiness",
        scope:
          "Determines whether EXOTIC is mature enough for internal, partner, or public use.",
        triggers: [
          "Stability threshold reached",
          "Evidence of repeatable execution",
          "Risk review completed",
        ],
      },
    ],
  };
}

function buildEcosystem(roadmap, repo, state, metrics) {
  const roadmapById = Object.fromEntries(
    roadmap.map((item) => [item.id, item]),
  );
  const canonicalModel = roadmapById["P1-02"];
  const workspaceShell = roadmapById["P1-03"];
  const workspaceGeneration = roadmapById["P1-04"];
  const monorepo = roadmapById["P1-01"];
  const ventureModelSpecified = fs.existsSync(ventureModelSpecFile);

  const profiles = ecosystemProfiles();
  const nodes = [
    {
      id: "venture-orchestrator",
      title: "Venture Orchestrator",
      section: "Core Platform",
      progress: Math.max(18, Number(workspaceGeneration?.progress || 0)),
      definition:
        "Turns a broad request into one connected venture workspace with strategy, execution, artifacts, and evidence.",
      completed:
        "Shared EXOTIC direction is defined and the operations console can now observe build focus, roadmap, repo state, and operator notes.",
      needed:
        "Connect venture generation flow so one request consistently expands into real editable outputs across every studio.",
      dependencies: [
        "universal-graph",
        "memory-system",
        "agent-runtime",
        "artifact-evidence",
      ],
      evidence: [
        state.summary || "No summary recorded yet.",
        state.nextStep || "No next step recorded yet.",
      ],
    },
    {
      id: "universal-graph",
      title: "Universal Graph",
      section: "Core Platform",
      progress: Math.max(
        ventureModelSpecified ? 34 : 12,
        Number(canonicalModel?.progress || 0),
      ),
      definition:
        "Shared object model for ventures, objectives, workflows, artifacts, approvals, evidence, and outcomes.",
      completed: ventureModelSpecified
        ? "Canonical venture model has been specified with core entities, relationships, lifecycle states, studio contracts, and completion rules."
        : "Canonical venture model is identified as a first-phase critical workstream.",
      needed: ventureModelSpecified
        ? "Implement persistence, graph APIs, and studio read/write enforcement against the specified model."
        : "Define graph schema, entity relationships, persistence shape, and studio-level read/write contracts.",
      dependencies: ["memory-system", "authority-system"],
      evidence: ventureModelSpecified
        ? [
            "Roadmap step P1-02 tracks the canonical venture model.",
            "docs/VENTURE_MODEL_SPEC.md defines entities, relationships, lifecycle states, and studio contracts.",
          ]
        : [
            "Roadmap step P1-02 tracks the canonical venture model.",
            canonicalModel?.summary || "Schema work not yet implemented.",
          ],
    },
    {
      id: "memory-system",
      title: "Memory System",
      section: "Core Platform",
      progress: 14,
      definition:
        "Persistent contextual memory for venture state, operator notes, research, design decisions, and execution history.",
      completed:
        "Filesystem bridge stores state, roadmap, and operator message history for ongoing work continuity.",
      needed:
        "Expand from bridge notes into structured venture memory with retrieval, tagging, and artifact linkage.",
      dependencies: ["artifact-evidence"],
      evidence: [
        "Bridge files exist in .exotic/codex-bridge.",
        "Operator notes persist across sessions.",
      ],
    },
    {
      id: "agent-runtime",
      title: "Agent Runtime",
      section: "Core Platform",
      progress: Math.max(22, Number(metrics.overallProgress || 0)),
      definition:
        "Execution layer coordinating Codex, automations, tools, and operator control for build progression.",
      completed:
        "Live bridge runtime exists, snapshot serving works, and auto mode start/pause now persists from the console.",
      needed:
        "Attach auto mode to actual scheduled build routines and make task execution honor paused/running state.",
      dependencies: ["authority-system", "operations-console"],
      evidence: [
        "Live runtime serves /api/v1/console/snapshot.",
        `Auto mode is currently ${state.autoMode === "paused" ? "paused" : "running"}.`,
      ],
    },
    {
      id: "authority-system",
      title: "Authority System",
      section: "Core Platform",
      progress: 8,
      definition:
        "Approval, control, and governance model for deciding what EXOTIC may do autonomously versus what requires operator confirmation.",
      completed:
        "Manual operator bridge exists and the console exposes visible runtime control.",
      needed:
        "Formalize roles, approvals, spending/launch boundaries, and autonomous action policies.",
      dependencies: ["agent-runtime"],
      evidence: [
        "Operator notes can redirect work.",
        "No full approval matrix has been implemented yet.",
      ],
    },
    {
      id: "artifact-evidence",
      title: "Artifact and Evidence Layer",
      section: "Core Platform",
      progress: 16,
      definition:
        "Links outputs to proof: code, documents, designs, research, metrics, validations, and audit entries.",
      completed:
        "Audit stream, git visibility, roadmap state, and bridge messages are surfaced in one observer.",
      needed:
        "Tie each generated business/product/marketing output to evidence records and verification results.",
      dependencies: ["operations-console", "analytics-observability"],
      evidence: [
        "Audit stream is live.",
        repo.summary || "Repo summary unavailable.",
      ],
    },
    {
      id: "ideas-studio",
      title: "Ideas Studio",
      section: "Studios",
      progress: 6,
      definition:
        "Problem framing, opportunity shaping, and venture concept generation.",
      completed: "High-level EXOTIC venture vision is defined.",
      needed:
        "Create dedicated idea capture, scoring, clustering, and conversion into venture objects.",
      dependencies: ["venture-orchestrator", "universal-graph"],
      evidence: [
        "Product vision exists in operator brief.",
        "No studio UI or pipelines yet.",
      ],
    },
    {
      id: "business-studio",
      title: "Business Studio",
      section: "Studios",
      progress: 7,
      definition:
        "Business model, market framing, goals, budgets, approvals, and launch planning.",
      completed:
        "Business framing is now being treated as real-world and serious rather than cosmetic.",
      needed:
        "Implement structured strategy, goals, assumptions, budgets, and approval flows backed by actual data.",
      dependencies: ["venture-orchestrator", "artifact-evidence"],
      evidence: [
        "Fake money language was removed from the console.",
        "No business model workspace yet.",
      ],
    },
    {
      id: "product-studio",
      title: "Product Studio",
      section: "Studios",
      progress: 10,
      definition:
        "Requirements, scope, workflows, releases, and implementation planning.",
      completed:
        "Roadmap tracking exists and can express current build milestones.",
      needed:
        "Translate venture goals into formal PRDs, milestones, tasks, and release artifacts.",
      dependencies: ["universal-graph", "development-studio"],
      evidence: [
        `${roadmap.length} roadmap steps currently tracked.`,
        monorepo?.summary || "Roadmap is active.",
      ],
    },
    {
      id: "design-studio",
      title: "Design Studio",
      section: "Studios",
      progress: 18,
      definition:
        "Brand, visual systems, interface design, motion, and experience structure.",
      completed:
        "Operations console visual direction has been reworked into a serious black/white workspace with branded logo integration.",
      needed:
        "Extend the same system into full EXOTIC studio shells and shared component language.",
      dependencies: ["website-studio", "operations-console"],
      evidence: [
        "Console UI has been redesigned around the ER logo and dense workspace layout.",
      ],
    },
    {
      id: "website-studio",
      title: "Website Studio",
      section: "Studios",
      progress: 12,
      definition:
        "Web presence, landing pages, deployment surfaces, and public venture output.",
      completed:
        "A browser-based operations console is live and serves from the local runtime.",
      needed:
        "Build actual EXOTIC public site and venture-facing web generation flows.",
      dependencies: ["design-studio", "development-studio"],
      evidence: [
        "Console is served at 127.0.0.1:8787.",
        "No public EXOTIC site production flow yet.",
      ],
    },
    {
      id: "development-studio",
      title: "Development Studio",
      section: "Studios",
      progress: Math.max(20, Number(monorepo?.progress || 0)),
      definition:
        "Code generation, repo changes, testing, packaging, and implementation orchestration.",
      completed:
        "Live repo scanning, changed-file samples, and the active monorepo stabilization step are wired into the observer.",
      needed:
        "Finish build stabilization, standardize execution entrypoints, and connect plan-driven implementation loops.",
      dependencies: ["agent-runtime", "operations-console"],
      evidence: [
        repo.summary || "Repo summary unavailable.",
        monorepo?.summary || "Monorepo stabilization not defined.",
      ],
    },
    {
      id: "marketing-studio",
      title: "Marketing Studio",
      section: "Studios",
      progress: 4,
      definition:
        "Messaging, campaigns, launch sequencing, growth loops, and communication assets.",
      completed:
        "Studio is defined conceptually as part of the EXOTIC workspace.",
      needed:
        "Create campaign plans, asset generation, metrics feedback loops, and launch workflows.",
      dependencies: ["business-studio", "artifact-evidence"],
      evidence: ["No implemented marketing layer yet."],
    },
    {
      id: "research-studio",
      title: "Research Studio",
      section: "Studios",
      progress: 6,
      definition:
        "Evidence gathering, competitive research, sourcing, and synthesis.",
      completed: "Research is part of the defined EXOTIC product concept.",
      needed:
        "Add source collection, synthesis workspaces, citation/evidence linking, and structured research outputs.",
      dependencies: ["memory-system", "artifact-evidence"],
      evidence: ["No dedicated research workflow shipped yet."],
    },
    {
      id: "workflows-studio",
      title: "Workflows Studio",
      section: "Studios",
      progress: 15,
      definition:
        "Automation design, recurring routines, queues, and action chains.",
      completed:
        "Bridge automation state and operator-start/pause controls are implemented.",
      needed:
        "Build actual plan-driven workflow engine that advances work from milestone to milestone.",
      dependencies: ["agent-runtime", "authority-system"],
      evidence: [
        "Auto mode control exists in the console.",
        "Execution workflows are not yet fully autonomous.",
      ],
    },
    {
      id: "operations-studio",
      title: "Operations Studio",
      section: "Studios",
      progress: 34,
      definition:
        "Operational oversight, priorities, runtime control, blockers, and health monitoring.",
      completed:
        "This operations console exists, shows live state, and now exposes ecosystem visibility and runtime controls.",
      needed:
        "Add deeper scheduling, alerts, run history, and execution metrics tied to actual workstreams.",
      dependencies: ["operations-console", "analytics-observability"],
      evidence: [
        "Overview, roadmap, activity, bridge, and live controls are implemented.",
      ],
    },
    {
      id: "operations-console",
      title: "Operations Console",
      section: "Control Plane",
      progress: 52,
      definition:
        "Primary observer for current focus, system state, roadmap progress, controls, and ecosystem structure.",
      completed:
        "Console is live, redesigned, connected to the repo bridge, and now includes auto mode control.",
      needed:
        "Keep deepening operational views, reduce ambiguity, and connect more of EXOTIC’s actual internals.",
      dependencies: ["agent-runtime", "artifact-evidence"],
      evidence: [
        "Live snapshot endpoint is active.",
        "Interactive control surface exists.",
      ],
    },
    {
      id: "analytics-observability",
      title: "Analytics and Observability",
      section: "Control Plane",
      progress: 19,
      definition:
        "Health, progress, outputs, verification, and performance visibility across the whole system.",
      completed:
        "Repo scan, activity audit, roadmap progress, and service health are already visible.",
      needed:
        "Add studio-specific KPIs, artifact completion tracking, verification summaries, and historical trend views.",
      dependencies: ["artifact-evidence", "operations-console"],
      evidence: [
        "Current dashboard includes health, repo, roadmap, and audit data.",
      ],
    },
    {
      id: "venture-workspace",
      title: "Generated Venture Workspace",
      section: "Delivery Surface",
      progress: Math.max(10, Number(workspaceGeneration?.progress || 0)),
      definition:
        "The actual working environment generated from a request, containing research, strategy, product, implementation, marketing, and operations.",
      completed:
        "The target behavior is explicitly defined as a core EXOTIC requirement.",
      needed:
        "Implement end-to-end generation of editable venture workspaces from operator requests.",
      dependencies: [
        "venture-orchestrator",
        "universal-graph",
        "studios-shell",
      ],
      evidence: [
        workspaceGeneration?.summary ||
          "Venture workspace generation is not yet implemented.",
      ],
    },
    {
      id: "studios-shell",
      title: "Unified Studios Shell",
      section: "Delivery Surface",
      progress: Math.max(10, Number(workspaceShell?.progress || 0)),
      definition:
        "Single interface shell where Ideas, Business, Product, Design, Website, Development, Marketing, Research, Workflows, and Operations are connected views over one system.",
      completed:
        "The requirement for one connected shell is defined and an operations-facing slice exists.",
      needed:
        "Build the unified shell architecture and attach each studio view to shared underlying state.",
      dependencies: ["universal-graph", "operations-console"],
      evidence: [
        workspaceShell?.summary || "Unified shell work not yet implemented.",
      ],
    },
  ].map((node) => ({
    ...node,
    ...profiles[node.id],
    status: lifecycleStatus(node.progress),
  }));

  const links = [
    ["venture-orchestrator", "universal-graph"],
    ["venture-orchestrator", "studios-shell"],
    ["venture-orchestrator", "venture-workspace"],
    ["universal-graph", "memory-system"],
    ["universal-graph", "authority-system"],
    ["memory-system", "research-studio"],
    ["agent-runtime", "workflows-studio"],
    ["agent-runtime", "development-studio"],
    ["operations-console", "operations-studio"],
    ["operations-console", "analytics-observability"],
    ["design-studio", "website-studio"],
    ["business-studio", "marketing-studio"],
    ["product-studio", "development-studio"],
    ["studios-shell", "ideas-studio"],
    ["studios-shell", "business-studio"],
    ["studios-shell", "product-studio"],
    ["studios-shell", "design-studio"],
    ["studios-shell", "website-studio"],
    ["studios-shell", "development-studio"],
    ["studios-shell", "marketing-studio"],
    ["studios-shell", "research-studio"],
    ["studios-shell", "workflows-studio"],
    ["studios-shell", "operations-studio"],
  ].map(([from, to]) => ({ from, to }));

  const sections = [
    "Core Platform",
    "Studios",
    "Control Plane",
    "Delivery Surface",
  ].map((section) => {
    const sectionNodes = nodes.filter((node) => node.section === section);
    const completed = sectionNodes.filter(
      (node) => node.status === "completed",
    ).length;
    const running = sectionNodes.filter(
      (node) => node.status === "running",
    ).length;
    const pending = sectionNodes.filter(
      (node) => node.status === "pending",
    ).length;
    const progress = Math.round(
      sectionNodes.reduce((sum, node) => sum + node.progress, 0) /
        Math.max(sectionNodes.length, 1),
    );
    return { title: section, progress, completed, running, pending };
  });

  return {
    summary: {
      progress: Math.round(
        nodes.reduce((sum, node) => sum + node.progress, 0) /
          Math.max(nodes.length, 1),
      ),
      completed: nodes.filter((node) => node.status === "completed").length,
      active: nodes.filter((node) => node.status === "running").length,
      pending: nodes.filter((node) => node.status === "pending").length,
      total: nodes.length,
    },
    sections,
    nodes,
    links,
  };
}

function baseSnapshot() {
  return {
    summary: {
      workspace: repoRoot,
      version: "1.0.0",
      mode: "codex-bridge",
      uptime: uptime(),
      health: 0,
      activeOperations: 0,
      queuedJobs: 0,
      pendingApprovals: 0,
      activeAgents: 1,
      openAlerts: 0,
      emergencyStop: false,
      lastSync: new Date().toISOString(),
    },
    audit: [],
    bridge: {},
  };
}

function buildSnapshot() {
  ensureBridgeFiles();
  const data = baseSnapshot();
  const state = readBridgeState();
  const roadmap = readRoadmap();
  const messages = readMessages();
  const repo = gitSummary();
  const workspace = syncWorkspaceState({ state, roadmap });
  const now = new Date().toISOString();
  const runningCount = roadmap.filter(
    (item) => item.status === "running",
  ).length;
  const completedCount = roadmap.filter(
    (item) => item.status === "completed",
  ).length;
  const pendingCount = roadmap.filter(
    (item) => item.status === "pending",
  ).length;
  const averageProgress = roadmap.length
    ? Math.round(
        roadmap.reduce((sum, item) => sum + Number(item.progress || 0), 0) /
          roadmap.length,
      )
    : 0;
  const autoMode = state.autoMode === "paused" ? "paused" : "running";
  const productionFabric = buildRoadmapProductionFabric(roadmap);

  data.summary.workspace = repoRoot;
  data.summary.mode = "codex-bridge";
  data.summary.uptime = uptime();
  data.summary.activeOperations = runningCount;
  data.summary.queuedJobs = pendingCount;
  data.summary.pendingApprovals = 0;
  data.summary.openAlerts = 0;
  data.summary.activeAgents = 1;
  data.summary.health = Math.max(
    55,
    Math.min(99, 100 - Math.min(45, repo.changedFiles + repo.untrackedFiles)),
  );
  data.summary.lastSync = now;

  data.audit = [
    {
      id: `AUD-${Date.now()}`,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      actor: "codex.bridge",
      event: "bridge.snapshot",
      entity: "EXOTIC",
      message:
        state.lastCodexUpdate ||
        "Console snapshot generated from workspace bridge state.",
      accent: "blue",
    },
    ...messages.slice(0, 4).map((message, index) => ({
      id: `AUD-BRIDGE-${index}`,
      time: new Date(message.timestamp || now).toLocaleTimeString("en-US", {
        hour12: false,
      }),
      actor: message.author || "operator",
      event: message.kind || "operator-note",
      entity: "bridge.inbox",
      message: message.message,
      accent: "yellow",
    })),
  ];
  data.summary.openAlerts =
    Number(Boolean(state.blockers?.length)) + Number(repo.changedFiles > 40);

  const activeStep =
    roadmap.find((item) => item.status === "running") || roadmap[0] || null;
  const nextPendingStep =
    roadmap.find((item) => item.status === "pending") || null;
  const mind = {
    objective: activeStep
      ? `${activeStep.id} ${activeStep.title}`
      : "Maintain EXOTIC continuity under the active master plan.",
    summary: activeStep
      ? `EXOTIC is currently advancing ${activeStep.title} while preserving workspace alignment, visible evidence, and operator control.`
      : "EXOTIC is maintaining state, waiting for the next constrained move.",
    currentMove: activeStep
      ? `Advance ${activeStep.id} from ${activeStep.progress}% toward verifiable completion.`
      : "Hold steady and preserve the current workspace state.",
    whyNow: nextPendingStep
      ? `This move stays ahead of ${nextPendingStep.id} so downstream studios inherit cleaner structure and less ambiguity.`
      : "No downstream step is queued ahead of the current move.",
    expectedOutput: activeStep
      ? `Updated roadmap state, workspace artifacts, and evidence for ${activeStep.id}.`
      : "Current-state preservation and readiness for the next step.",
    evidenceTarget:
      "Roadmap progression, workspace files, current-state reporting, and execution evidence logs.",
    checklist: [
      activeStep
        ? `Check active step ${activeStep.id} status and progress.`
        : "Check whether any active step exists.",
      "Preserve venture workspace integrity.",
      "Avoid drifting away from the auto mode master plan.",
      "Leave visible evidence of every meaningful change.",
    ],
    constraints: [
      "Do not treat scaffolded progress as full professional completion.",
      "Do not bypass approval-gated business or launch decisions.",
      repo.changedFiles > 40
        ? `Repository is noisy at ${repo.changedFiles} changed files, so changes must remain traceable.`
        : "Repository noise is within a manageable range.",
      state.autoMode === "paused"
        ? "Auto mode is paused, so reasoning must hold state instead of advancing execution."
        : "Auto mode is running, so advancement is allowed within current constraints.",
    ],
    recentThoughts: [
      {
        label: "Read state",
        detail: `Bridge state loaded from ${path.basename(stateStoragePath())} with auto mode ${state.autoMode === "paused" ? "paused" : "running"}.`,
      },
      {
        label: "Check queue",
        detail: `${completedCount} completed, ${runningCount} running, ${pendingCount} pending roadmap steps are currently visible.`,
      },
      {
        label: "Protect alignment",
        detail:
          "The active move must stay aligned to the EXOTIC canonical definition, venture model, and auto mode master plan.",
      },
      {
        label: "Prepare handoff",
        detail: nextPendingStep
          ? `The next likely handoff target is ${nextPendingStep.id} ${nextPendingStep.title}.`
          : "No further pending step is visible after the current work.",
      },
    ],
  };

  data.bridge = {
    focus: {
      title: state.title || "EXOTIC v1 auto-build",
      summary: state.summary || "No summary recorded yet.",
      nextStep:
        state.nextStep ||
        "Choose the next highest-priority EXOTIC v1 milestone.",
      updatedAt: state.updatedAt || now,
    },
    automation: {
      mode: autoMode,
      label: autoMode === "running" ? "Auto mode running" : "Auto mode paused",
      detail:
        autoMode === "running"
          ? "EXOTIC is set to continue stepping through the active build plan."
          : "EXOTIC is intentionally paused and waiting for operator resume.",
      updatedAt: state.updatedAt || now,
    },
    productionFabric,
    execution:
      state.executionIntent ||
      (activeStep
        ? {
            stepId: activeStep.id,
            title: activeStep.title,
            prompt: `Continue ${activeStep.id} in priority order. Make one concrete, verifiable change and record the evidence before changing progress.`,
            evidenceRequired: true,
            generatedAt: state.updatedAt || now,
          }
        : null),
    executionFabric:
      state.executionFabric || {
        fabricId: productionFabric.id,
        strategy: productionFabric.strategy,
        maxConcurrency: productionFabric.maxConcurrency,
        verificationBarrier: true,
        cells: productionFabric.activeStepIds.map((stepId) => {
          const step = roadmap.find((item) => item.id === stepId);
          return {
            stepId,
            lane: step?.lane || "roadmap",
            title: step?.title || stepId,
            evidenceRequired: true,
          };
        }),
        generatedAt: state.updatedAt || now,
      },
    repo: {
      workspace: repoRoot,
      branch: repo.branch,
      changedFiles: repo.changedFiles,
      untrackedFiles: repo.untrackedFiles,
      summary: repo.summary,
      changedPathsSample: repo.pathsSample,
      directoryBreakdown: repo.directoryBreakdown,
    },
    roadmap,
    messages,
    verification: readJson(verificationFile, null),
    mind,
    metrics: {
      completedSteps: completedCount,
      runningSteps: runningCount,
      pendingSteps: pendingCount,
      overallProgress: averageProgress,
      health: data.summary.health,
    },
    blockers: Array.isArray(state.blockers) ? state.blockers : [],
    services: [
      {
        id: "codex-bridge-runtime",
        label: "Bridge runtime",
        status: "healthy",
        detail: "Serving console state from workspace files.",
      },
      {
        id: "auto-mode",
        label: "Auto mode",
        status: autoMode === "running" ? "running" : "paused",
        detail:
          autoMode === "running"
            ? "Automation is enabled from the bridge state."
            : "Automation is paused from the bridge state.",
      },
      {
        id: "roadmap-relay",
        label: "Roadmap relay",
        status: roadmap.length ? "healthy" : "warning",
        detail: `${roadmap.length} roadmap steps loaded.`,
      },
      {
        id: "production-fabric",
        label: "Production fabric",
        status: productionFabric.blocked.length ? "warning" : "healthy",
        detail: `${productionFabric.metrics.layers} dependency layers, ${productionFabric.metrics.swarms} swarms, concurrency ${productionFabric.maxConcurrency}.`,
      },
      {
        id: "workspace-generator",
        label: "Workspace generator",
        status: workspace?.venture ? "healthy" : "warning",
        detail: workspace?.venture
          ? summarizeWorkspace(workspace)
          : "No venture workspace generated yet.",
      },
      {
        id: "git-scan",
        label: "Git scan",
        status: repo.summary.startsWith("Git scan failed")
          ? "critical"
          : statusFromHealth(data.summary.health),
        detail: repo.summary,
      },
    ],
    communication: {
      mode: "Filesystem relay",
      note: "This console can write operator notes into workspace bridge files. I can read them on future Codex runs and later replies.",
      bridgeRoot,
      stateFile: stateStoragePath(),
      roadmapFile: roadmapStoragePath(),
      workspaceFile: workspaceStoragePath(),
      masterPlanFile: autoModeMasterPlanFile,
      inboxFile,
      operatorLog,
      verificationFile,
      workspaceSummary: workspace?.venture
        ? summarizeWorkspace(workspace)
        : "No workspace generated yet.",
    },
    board: buildBoard(state),
    ecosystem: buildEcosystem(
      roadmap,
      repo,
      state,
      data.bridge?.metrics || {
        completedSteps: completedCount,
        runningSteps: runningCount,
        pendingSteps: pendingCount,
        overallProgress: averageProgress,
        health: data.summary.health,
      },
    ),
  };

  return data;
}

function json(res, code, value) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function appendOperatorNote(payload) {
  ensureBridgeFiles();
  const message = {
    timestamp: new Date().toISOString(),
    author: payload.author || "operator",
    kind: payload.kind || "operator-note",
    message: payload.message || "",
  };
  const inboxStorage = appendTextWithFallback(
    inboxFile,
    inboxFallbackFile,
    `${JSON.stringify(message)}${os.EOL}`,
  );
  const logStorage = appendTextWithFallback(
    operatorLog,
    operatorLogFallbackFile,
    `${os.EOL}## ${message.timestamp} · ${message.author}${os.EOL}${os.EOL}${message.message}${os.EOL}`,
  );
  return {
    ...message,
    storage: { inbox: inboxStorage, operatorLog: logStorage },
  };
}

// Extracts a non-empty evidence list from a payload, or null if none was supplied.
// Mirrors packages/workflow's own receiptEvidence() check so "no evidence" is treated
// the same way everywhere in the system: a plausible-looking but empty array is rejected,
// not silently accepted.
function payloadEvidence(payload) {
  if (!Array.isArray(payload.evidence)) return null;
  const evidence = payload.evidence.filter(
    (item) => typeof item === "string" && item.trim(),
  );
  return evidence.length ? evidence : null;
}

// Roadmap steps map to venture-workspace tasks by studio lane (task ids follow
// `${ventureId}-TASK-${studio.toUpperCase()}`, see packages/entity's createVentureWorkspace).
// Foundation-tier steps (P1-01..P1-04) have no matching studio task, so their evidence
// attaches to the venture itself instead - still a real, existing entity the contract
// can validate against.
function recordRoadmapEvidence(workspace, step, evidence) {
  const ventureId = workspace.venture.ventureId;
  const matchingTask = (workspace.tasks || []).find((task) =>
    task.taskId.endsWith(`-TASK-${String(step.lane || "").toUpperCase()}`),
  );
  const next = appendEvidenceRecord(workspace, {
    relatedEntityType: matchingTask ? "task" : "venture",
    relatedEntityId: matchingTask ? matchingTask.taskId : ventureId,
    evidenceType: "runtime-log",
    source: `${step.id} ${step.title}: ${evidence.join("; ")}`,
  });
  return writeWorkspace(next);
}

function updateRoadmapItem(payload) {
  ensureBridgeFiles();
  const roadmap = readRoadmap();
  const current = roadmap.find((item) => item.id === payload.id);
  if (!current) throw new Error(`Unknown roadmap step: ${payload.id}`);

  const nextStatus = payload.status || current.status;
  const nextProgress =
    typeof payload.progress === "number"
      ? Math.max(0, Math.min(100, payload.progress))
      : nextStatus === "completed"
        ? 100
        : nextStatus === "running" && Number(current.progress || 0) === 0
          ? 25
          : Number(current.progress || 0);

  // Auto-mode ticks cannot increase completion percentages, and completion always
  // requires evidence - see docs/AUTO_MODE_MASTER_PLAN.md and docs/SYSTEM_OVERHAUL_V2.md.
  // Applied uniformly to every caller (console UI, worker adapter, direct API use): a
  // human marking something done manually still has to say what proves it.
  const evidence = payloadEvidence(payload);
  const requiresEvidence =
    nextStatus === "completed" || nextProgress > Number(current.progress || 0);
  if (requiresEvidence && !evidence) {
    throw new Error(
      `Roadmap step ${payload.id} cannot ${nextStatus === "completed" ? "be marked completed" : "advance progress"} ` +
        `without evidence. Include a non-empty "evidence" array describing what was verified.`,
    );
  }

  const nextRoadmap = roadmap.map((item) =>
    item.id === payload.id
      ? { ...item, status: nextStatus, progress: nextProgress }
      : item,
  );
  writeRoadmap(nextRoadmap);
  const updated = nextRoadmap.find((item) => item.id === payload.id);

  if (evidence) {
    recordRoadmapEvidence(ensureWorkspaceFile(), updated, evidence);
  }

  const state = writeBridgeState({
    lastCodexUpdate: `Roadmap step ${updated.id} set to ${updated.status} from operations console.`,
  });
  if (state.autoMode !== "paused") {
    autoAdvanceRoadmap().catch((error) => {
      console.error("autoAdvanceRoadmap failed:", error instanceof Error ? error.message : error);
    });
  }
  return updated;
}

function setAutoMode(mode) {
  const nextMode = mode === "paused" ? "paused" : "running";
  return writeBridgeState({
    autoMode: nextMode,
    status: nextMode,
    lastCodexUpdate:
      nextMode === "running"
        ? "Auto mode resumed from operations console."
        : "Auto mode paused from operations console.",
  });
}

// Guards against overlapping dispatches: a worker invocation can take a while (it waits
// for a real CLI/model call), and can run longer than autoTickMs. Without this, a slow
// dispatch plus the next scheduled tick could spawn a second worker for the same step.
let dispatchInFlight = false;

async function autoAdvanceRoadmap() {
  if (dispatchInFlight) return;
  ensureBridgeFiles();
  const state = readBridgeState();
  if (state.autoMode === "paused") return;

  const roadmap = readRoadmap();
  if (!roadmap.length) return;

  const nextRoadmap = roadmap.map((item) => ({ ...item }));
  let fabric = buildRoadmapProductionFabric(nextRoadmap);
  const activeSteps = nextRoadmap.filter((item) => item.status === "running");
  const availableCells = Math.max(0, swarmConcurrency - activeSteps.length);
  let roadmapChanged = false;
  for (const stepId of fabric.readyStepIds.slice(0, availableCells)) {
    const step = nextRoadmap.find((item) => item.id === stepId);
    if (!step) continue;
    step.status = "running";
    step.progress = Number(step.progress || 0);
    activeSteps.push(step);
    roadmapChanged = true;
  }
  if (roadmapChanged) {
    writeRoadmap(nextRoadmap);
    fabric = buildRoadmapProductionFabric(nextRoadmap);
  }
  if (!activeSteps.length) return;

  const activeStep = activeSteps[0];

  const generatedAt = new Date().toISOString();
  const refreshedState = writeBridgeState({
    lastCodexUpdate: `Production Fabric is holding ${activeSteps.map((step) => `${step.id} at ${step.progress}%`).join(", ")} until verified execution evidence is recorded.`,
    nextStep: `Execute the active production cells: ${activeSteps.map((step) => step.id).join(", ")}.`,
    executionIntent: {
      stepId: activeStep.id,
      title: activeStep.title,
      prompt: `Continue ${activeStep.id} in priority order. Make one concrete, verifiable change and record the evidence before changing progress.`,
      evidenceRequired: true,
      generatedAt,
    },
    executionFabric: {
      fabricId: fabric.id,
      strategy: fabric.strategy,
      maxConcurrency: fabric.maxConcurrency,
      verificationBarrier: true,
      cells: activeSteps.map((step) => ({
        stepId: step.id,
        lane: step.lane || "roadmap",
        title: step.title,
        prompt: `Continue ${step.id} within its declared dependencies. Produce one concrete output and attach verification evidence before changing progress.`,
        evidenceRequired: true,
      })),
      generatedAt,
    },
  });
  syncWorkspaceState({ state: refreshedState, roadmap: nextRoadmap });
  appendExecutionEvidence(nextRoadmap, refreshedState, activeStep);

  await dispatchActiveStep(activeStep);
}

// Actually dispatches the active step to a real worker backend and records the outcome -
// this is the piece that was missing before: autoAdvanceRoadmap used to write an
// executionIntent prompt and then stop, so nothing ever advanced past 0%.
async function dispatchActiveStep(step) {
  dispatchInFlight = true;
  try {
    const result = await dispatchStep(
      { id: step.id, title: step.title, lane: step.lane, dependsOn: step.dependsOn },
      { backend: workerBackendName, cwd: repoRoot },
    );
    if (result.status === "completed") {
      updateRoadmapItem({
        id: step.id,
        status: "completed",
        progress: 100,
        evidence: result.receipt.evidence,
      });
    } else {
      const state = readBridgeState();
      const blockers = Array.isArray(state.blockers) ? state.blockers : [];
      writeBridgeState({
        blockers: [
          ...blockers.filter((blocker) => blocker.stepId !== step.id),
          { stepId: step.id, reason: result.error, recordedAt: new Date().toISOString() },
        ],
        lastCodexUpdate: `Worker dispatch for ${step.id} (${workerBackendName}) did not produce evidence: ${result.error}`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeBridgeState({
      lastCodexUpdate: `Worker dispatch for ${step.id} (${workerBackendName}) crashed: ${message}`,
    });
  } finally {
    dispatchInFlight = false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "127.0.0.1"}`,
  );
  if (req.method === "OPTIONS") return json(res, 200, {});
  if (url.pathname === "/api/v1/health")
    return json(res, 200, {
      ok: true,
      runtime: "EXOTIC Codex Bridge Runtime",
      version: "1.0.0",
      mode: "codex-bridge",
    });
  if (url.pathname === "/api/v1/console/snapshot")
    return json(res, 200, buildSnapshot());
  if (url.pathname === "/api/v1/bridge/state")
    return json(res, 200, buildSnapshot().bridge);
  if (url.pathname === "/api/v1/bridge/workspace")
    return json(res, 200, ensureWorkspaceFile());
  if (url.pathname === "/api/v1/bridge/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        return json(res, 400, { ok: false, message: "Invalid JSON payload." });
      }
      try {
        const message = appendOperatorNote(payload);
        json(res, 200, {
          ok: true,
          message: "Bridge note recorded.",
          item: message,
        });
      } catch (error) {
        json(res, 500, {
          ok: false,
          message: `Bridge note could not be recorded: ${error.message}`,
        });
      }
    });
    return;
  }
  if (url.pathname === "/api/v1/bridge/auto-mode" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        return json(res, 400, { ok: false, message: "Invalid JSON payload." });
      }
      const mode = payload.mode === "paused" ? "paused" : "running";
      const state = setAutoMode(mode);
      json(res, 200, {
        ok: true,
        message:
          mode === "running" ? "Auto mode started." : "Auto mode paused.",
        state,
      });
    });
    return;
  }
  if (url.pathname === "/api/v1/bridge/roadmap" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        return json(res, 400, { ok: false, message: "Invalid JSON payload." });
      }
      if (!payload.id)
        return json(res, 400, {
          ok: false,
          message: "Roadmap item id is required.",
        });
      try {
        const item = updateRoadmapItem(payload);
        return json(res, 200, {
          ok: true,
          message: `Roadmap step ${item.id} updated.`,
          item,
        });
      } catch (error) {
        const status = /^Unknown roadmap step/.test(error.message) ? 404 : 400;
        return json(res, status, { ok: false, message: error.message });
      }
    });
    return;
  }
  if (url.pathname.startsWith("/api/v1/actions/") && req.method === "POST") {
    return json(res, 200, {
      ok: true,
      message: `Bridge runtime acknowledged ${url.pathname.split("/").pop()}`,
    });
  }
  const rel =
    url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const file = path.resolve(dist, rel);
  if (!file.startsWith(dist)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
});

ensureBridgeFiles();
setInterval(() => {
  autoAdvanceRoadmap().catch((error) => {
    console.error("autoAdvanceRoadmap failed:", error instanceof Error ? error.message : error);
  });
}, autoTickMs);
server.listen(port, host, () => {
  console.log(`EXOTIC Codex bridge runtime: http://${host}:${port}`);
  console.log(`Bridge root: ${bridgeRoot}`);
  console.log(`Auto tick interval: ${autoTickMs}ms`);
  console.log(`Production Fabric concurrency: ${swarmConcurrency}`);
});
