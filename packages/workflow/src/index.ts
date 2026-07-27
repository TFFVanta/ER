import { studioExecutionDependencies } from "@exotic/types";
import type { StudioKind, Task, VentureWorkspace } from "@exotic/types";

export const identity = {
  name: "@exotic/workflow",
  tagline: "Everything Is Exotic.",
};

export type ProductionCellRole = "producer" | "challenger";
export type ProductionRunStatus =
  | "completed"
  | "blocked"
  | "partial"
  | "failed";

export interface ProductionJob {
  id: string;
  title: string;
  lane: string;
  dependsOn?: readonly string[];
  estimatedEffort?: number;
  replicas?: number;
  approvalRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProductionPlanInput {
  id?: string;
  title: string;
  jobs: readonly ProductionJob[];
  maxConcurrency?: number;
  maxReplicasPerJob?: number;
  approvedJobIds?: readonly string[];
}

export interface ProductionCell {
  cellId: string;
  jobId: string;
  lane: string;
  replica: number;
  role: ProductionCellRole;
}

export interface ProductionSwarm {
  swarmId: string;
  lane: string;
  jobIds: string[];
  cells: ProductionCell[];
}

export interface ProductionLayer {
  index: number;
  layerId: string;
  jobIds: string[];
  swarms: ProductionSwarm[];
  cellCount: number;
}

export interface BlockedProductionJob {
  jobId: string;
  reason: "approval-required" | "blocked-dependency";
  waitingOn: string[];
}

export interface ProductionPlanMetrics {
  totalJobs: number;
  scheduledJobs: number;
  blockedJobs: number;
  dependencyLayers: number;
  swarmCount: number;
  cellCount: number;
  maximumParallelJobs: number;
  maximumParallelCells: number;
  sequentialEffort: number;
  criticalPathEffort: number;
  dependencySpeedupCeiling: number;
}

export interface ProductionPlan {
  id: string;
  title: string;
  strategy: "dependency-layered-swarms";
  maxConcurrency: number;
  verificationBarrier: true;
  jobs: ProductionJob[];
  layers: ProductionLayer[];
  blocked: BlockedProductionJob[];
  metrics: ProductionPlanMetrics;
}

export interface ProductionReceipt<TOutput = unknown> {
  output: TOutput;
  evidence: readonly string[];
}

export interface ProductionCellContext {
  planId: string;
  layerIndex: number;
  swarmId: string;
  job: ProductionJob;
  cell: ProductionCell;
  attempt: number;
}

export type ProductionWorker<TOutput = unknown> = (
  context: ProductionCellContext,
) => Promise<ProductionReceipt<TOutput>> | ProductionReceipt<TOutput>;

export interface CompletedProductionCell<TOutput = unknown> {
  cell: ProductionCell;
  status: "completed";
  attempts: number;
  receipt: ProductionReceipt<TOutput>;
}

export interface FailedProductionCell {
  cell: ProductionCell;
  status: "failed";
  attempts: number;
  error: string;
}

export type ProductionCellRun<TOutput = unknown> =
  | CompletedProductionCell<TOutput>
  | FailedProductionCell;

export interface ProductionVerificationDecision {
  accepted: boolean;
  acceptedCellId?: string;
  evidence?: readonly string[];
  reason?: string;
}

export type ProductionVerifier<TOutput = unknown> = (input: {
  planId: string;
  layerIndex: number;
  job: ProductionJob;
  candidates: readonly CompletedProductionCell<TOutput>[];
}) => Promise<ProductionVerificationDecision> | ProductionVerificationDecision;

export interface ProductionJobRun<TOutput = unknown> {
  jobId: string;
  status: "completed" | "failed" | "blocked";
  acceptedCellId?: string;
  evidence: string[];
  reason?: string;
  cells: ProductionCellRun<TOutput>[];
}

export interface ProductionRun<TOutput = unknown> {
  planId: string;
  status: ProductionRunStatus;
  completedJobIds: string[];
  failedJobIds: string[];
  blockedJobIds: string[];
  jobs: ProductionJobRun<TOutput>[];
}

export interface ExecuteProductionPlanOptions<TOutput = unknown> {
  retries?: number;
  verifier?: ProductionVerifier<TOutput>;
}

export interface WorkspaceProductionPlanOptions {
  id?: string;
  title?: string;
  maxConcurrency?: number;
  maxReplicasPerJob?: number;
  approvedTaskIds?: readonly string[];
  approvalRequiredTaskIds?: readonly string[];
  replicasByStudio?: Partial<Record<StudioKind, number>>;
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  label: string,
): number {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return normalized;
}

function normalizedEffort(job: ProductionJob): number {
  const effort = job.estimatedEffort ?? 1;
  if (!Number.isFinite(effort) || effort <= 0) {
    throw new Error(`Job ${job.id} estimatedEffort must be greater than zero.`);
  }
  return effort;
}

function normalizedIdentifier(value: string, label: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${label} must be a non-empty identifier.`);
  return normalized;
}

function stableTopologicalOrder(
  jobs: readonly ProductionJob[],
): ProductionJob[] {
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const indegree = new Map(
    jobs.map((job) => [job.id, job.dependsOn?.length ?? 0]),
  );
  const dependents = new Map<string, string[]>();

  for (const job of jobs) {
    for (const dependencyId of job.dependsOn ?? []) {
      const list = dependents.get(dependencyId) ?? [];
      list.push(job.id);
      dependents.set(dependencyId, list);
    }
  }

  const queue = jobs.filter((job) => indegree.get(job.id) === 0);
  const ordered: ProductionJob[] = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const job = queue[cursor];
    ordered.push(job);
    for (const dependentId of dependents.get(job.id) ?? []) {
      const remaining = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, remaining);
      if (remaining === 0) queue.push(jobsById.get(dependentId)!);
    }
  }

  if (ordered.length !== jobs.length) {
    const cycleIds = jobs
      .filter((job) => !ordered.some((candidate) => candidate.id === job.id))
      .map((job) => job.id);
    throw new Error(
      `Production job dependency cycle detected: ${cycleIds.join(", ")}.`,
    );
  }
  return ordered;
}

function validateJobs(jobs: readonly ProductionJob[]): ProductionJob[] {
  const normalized = jobs.map((job, index) => ({
    ...job,
    id: normalizedIdentifier(job.id, `jobs[${index}].id`),
    title: normalizedIdentifier(job.title, `jobs[${index}].title`),
    lane: normalizedIdentifier(job.lane, `jobs[${index}].lane`),
    dependsOn: [...new Set(job.dependsOn ?? [])],
  }));
  const ids = new Set<string>();
  for (const job of normalized) {
    if (ids.has(job.id))
      throw new Error(`Duplicate production job identifier: ${job.id}.`);
    ids.add(job.id);
    normalizedEffort(job);
    positiveInteger(job.replicas, 1, `Job ${job.id} replicas`);
  }
  for (const job of normalized) {
    for (const dependencyId of job.dependsOn ?? []) {
      if (!ids.has(dependencyId)) {
        throw new Error(
          `Job ${job.id} depends on unknown job ${dependencyId}.`,
        );
      }
      if (dependencyId === job.id) {
        throw new Error(`Job ${job.id} cannot depend on itself.`);
      }
    }
  }
  stableTopologicalOrder(normalized);
  return normalized;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

export function planProductionFabric(
  input: ProductionPlanInput,
): ProductionPlan {
  const maxConcurrency = positiveInteger(
    input.maxConcurrency,
    4,
    "maxConcurrency",
  );
  const maxReplicasPerJob = positiveInteger(
    input.maxReplicasPerJob,
    3,
    "maxReplicasPerJob",
  );
  const jobs = validateJobs(input.jobs);
  const ordered = stableTopologicalOrder(jobs);
  const approved = new Set(input.approvedJobIds ?? []);
  const blockedById = new Map<string, BlockedProductionJob>();

  for (const job of jobs) {
    if (job.approvalRequired && !approved.has(job.id)) {
      blockedById.set(job.id, {
        jobId: job.id,
        reason: "approval-required",
        waitingOn: [job.id],
      });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const job of ordered) {
      if (blockedById.has(job.id)) continue;
      const waitingOn = (job.dependsOn ?? []).filter((dependencyId) =>
        blockedById.has(dependencyId),
      );
      if (waitingOn.length) {
        blockedById.set(job.id, {
          jobId: job.id,
          reason: "blocked-dependency",
          waitingOn,
        });
        changed = true;
      }
    }
  }

  const scheduled = ordered.filter((job) => !blockedById.has(job.id));
  const layerByJob = new Map<string, number>();
  const effortToJob = new Map<string, number>();
  const jobsByLayer = new Map<number, ProductionJob[]>();

  for (const job of scheduled) {
    const dependencyLayers = (job.dependsOn ?? []).map(
      (dependencyId) => layerByJob.get(dependencyId) ?? -1,
    );
    const layerIndex = dependencyLayers.length
      ? Math.max(...dependencyLayers) + 1
      : 0;
    layerByJob.set(job.id, layerIndex);
    const dependencyEfforts = (job.dependsOn ?? []).map(
      (dependencyId) => effortToJob.get(dependencyId) ?? 0,
    );
    effortToJob.set(
      job.id,
      normalizedEffort(job) +
        (dependencyEfforts.length ? Math.max(...dependencyEfforts) : 0),
    );
    const layerJobs = jobsByLayer.get(layerIndex) ?? [];
    layerJobs.push(job);
    jobsByLayer.set(layerIndex, layerJobs);
  }

  const layers: ProductionLayer[] = [...jobsByLayer.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, layerJobs]) => {
      const jobsByLane = new Map<string, ProductionJob[]>();
      for (const job of layerJobs) {
        const laneJobs = jobsByLane.get(job.lane) ?? [];
        laneJobs.push(job);
        jobsByLane.set(job.lane, laneJobs);
      }
      const swarms = [...jobsByLane.entries()].map(([lane, laneJobs]) => {
        const cells = laneJobs.flatMap((job) => {
          const replicas = Math.min(
            positiveInteger(job.replicas, 1, `Job ${job.id} replicas`),
            maxReplicasPerJob,
          );
          return Array.from({ length: replicas }, (_, replica) => ({
            cellId: `${job.id}:cell-${replica + 1}`,
            jobId: job.id,
            lane,
            replica: replica + 1,
            role: replica === 0 ? "producer" : "challenger",
          })) satisfies ProductionCell[];
        });
        return {
          swarmId: `layer-${index + 1}:${lane}`,
          lane,
          jobIds: laneJobs.map((job) => job.id),
          cells,
        } satisfies ProductionSwarm;
      });
      return {
        index,
        layerId: `layer-${index + 1}`,
        jobIds: layerJobs.map((job) => job.id),
        swarms,
        cellCount: swarms.reduce((sum, swarm) => sum + swarm.cells.length, 0),
      } satisfies ProductionLayer;
    });

  const sequentialEffort = scheduled.reduce(
    (sum, job) => sum + normalizedEffort(job),
    0,
  );
  const criticalPathEffort = Math.max(0, ...effortToJob.values());
  const cellCount = layers.reduce((sum, layer) => sum + layer.cellCount, 0);
  const swarmCount = layers.reduce(
    (sum, layer) => sum + layer.swarms.length,
    0,
  );

  return {
    id: input.id?.trim() || "production-fabric",
    title: input.title.trim() || "Production Fabric",
    strategy: "dependency-layered-swarms",
    maxConcurrency,
    verificationBarrier: true,
    jobs,
    layers,
    blocked: jobs
      .filter((job) => blockedById.has(job.id))
      .map((job) => blockedById.get(job.id)!),
    metrics: {
      totalJobs: jobs.length,
      scheduledJobs: scheduled.length,
      blockedJobs: blockedById.size,
      dependencyLayers: layers.length,
      swarmCount,
      cellCount,
      maximumParallelJobs: Math.max(
        0,
        ...layers.map((layer) => layer.jobIds.length),
      ),
      maximumParallelCells: Math.max(
        0,
        ...layers.map((layer) => layer.cellCount),
      ),
      sequentialEffort: roundMetric(sequentialEffort),
      criticalPathEffort: roundMetric(criticalPathEffort),
      dependencySpeedupCeiling:
        criticalPathEffort > 0
          ? roundMetric(sequentialEffort / criticalPathEffort)
          : 0,
    },
  };
}

async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  run: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let cursor = 0;
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await run(items[index]);
      }
    }),
  );
  return results;
}

function receiptEvidence<TOutput>(
  receipt: ProductionReceipt<TOutput>,
): string[] {
  if (!receipt || typeof receipt !== "object" || !("evidence" in receipt)) {
    throw new Error("Worker did not return a production receipt.");
  }
  const evidence = Array.isArray(receipt.evidence)
    ? receipt.evidence.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
  if (!evidence.length) {
    throw new Error("Worker receipt did not include completion evidence.");
  }
  return evidence;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function executeProductionFabric<TOutput = unknown>(
  plan: ProductionPlan,
  worker: ProductionWorker<TOutput>,
  options: ExecuteProductionPlanOptions<TOutput> = {},
): Promise<ProductionRun<TOutput>> {
  const retries = Math.max(0, Math.floor(options.retries ?? 0));
  const jobsById = new Map(plan.jobs.map((job) => [job.id, job]));
  const completed = new Set<string>();
  const jobRuns: ProductionJobRun<TOutput>[] = [];

  for (const layer of plan.layers) {
    const readyJobIds = new Set<string>();
    for (const jobId of layer.jobIds) {
      const job = jobsById.get(jobId)!;
      const unmet = (job.dependsOn ?? []).filter(
        (dependencyId) => !completed.has(dependencyId),
      );
      if (unmet.length) {
        jobRuns.push({
          jobId,
          status: "blocked",
          evidence: [],
          reason: `Unverified dependencies: ${unmet.join(", ")}.`,
          cells: [],
        });
      } else {
        readyJobIds.add(jobId);
      }
    }

    const cells = layer.swarms.flatMap((swarm) =>
      swarm.cells
        .filter((cell) => readyJobIds.has(cell.jobId))
        .map((cell) => ({ cell, swarmId: swarm.swarmId })),
    );
    const cellRuns = await mapWithConcurrency(
      cells,
      plan.maxConcurrency,
      async ({ cell, swarmId }): Promise<ProductionCellRun<TOutput>> => {
        let lastError = "Production cell failed.";
        for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
          try {
            const receipt = await worker({
              planId: plan.id,
              layerIndex: layer.index,
              swarmId,
              job: jobsById.get(cell.jobId)!,
              cell,
              attempt,
            });
            const evidence = receiptEvidence(receipt);
            return {
              cell,
              status: "completed",
              attempts: attempt,
              receipt: { ...receipt, evidence },
            };
          } catch (error) {
            lastError = errorMessage(error);
          }
        }
        return {
          cell,
          status: "failed",
          attempts: retries + 1,
          error: lastError,
        };
      },
    );

    for (const jobId of readyJobIds) {
      const job = jobsById.get(jobId)!;
      const jobCells = cellRuns.filter(
        (cellRun) => cellRun.cell.jobId === jobId,
      );
      const candidates = jobCells.filter(
        (cellRun): cellRun is CompletedProductionCell<TOutput> =>
          cellRun.status === "completed",
      );
      if (!candidates.length) {
        jobRuns.push({
          jobId,
          status: "failed",
          evidence: [],
          reason: "No production cell returned evidence-backed output.",
          cells: jobCells,
        });
        continue;
      }

      let decision: ProductionVerificationDecision = {
        accepted: true,
        acceptedCellId: candidates[0].cell.cellId,
      };
      try {
        if (options.verifier) {
          decision = await options.verifier({
            planId: plan.id,
            layerIndex: layer.index,
            job,
            candidates,
          });
        }
      } catch (error) {
        decision = { accepted: false, reason: errorMessage(error) };
      }

      const accepted = candidates.find(
        (candidate) => candidate.cell.cellId === decision.acceptedCellId,
      );
      if (!decision.accepted || !accepted) {
        jobRuns.push({
          jobId,
          status: "failed",
          evidence: [],
          reason:
            decision.reason ||
            "Verification did not accept an evidence-backed candidate.",
          cells: jobCells,
        });
        continue;
      }

      const verificationEvidence = (decision.evidence ?? []).filter(
        (item) => typeof item === "string" && Boolean(item.trim()),
      );
      completed.add(jobId);
      jobRuns.push({
        jobId,
        status: "completed",
        acceptedCellId: accepted.cell.cellId,
        evidence: [...accepted.receipt.evidence, ...verificationEvidence],
        cells: jobCells,
      });
    }
  }

  for (const blocked of plan.blocked) {
    jobRuns.push({
      jobId: blocked.jobId,
      status: "blocked",
      evidence: [],
      reason:
        blocked.reason === "approval-required"
          ? "Explicit approval is required."
          : `Blocked by ${blocked.waitingOn.join(", ")}.`,
      cells: [],
    });
  }

  const failedJobIds = jobRuns
    .filter((job) => job.status === "failed")
    .map((job) => job.jobId);
  const blockedJobIds = jobRuns
    .filter((job) => job.status === "blocked")
    .map((job) => job.jobId);
  let status: ProductionRunStatus = "completed";
  if (failedJobIds.length) status = completed.size ? "partial" : "failed";
  else if (blockedJobIds.length) status = "blocked";

  return {
    planId: plan.id,
    status,
    completedJobIds: [...completed],
    failedJobIds,
    blockedJobIds,
    jobs: jobRuns,
  };
}

export const studioProductionDependencies = studioExecutionDependencies;

const studioEffort: Readonly<Record<StudioKind, number>> = {
  ideas: 2,
  research: 3,
  business: 4,
  product: 4,
  design: 3,
  development: 5,
  marketing: 3,
  workflows: 4,
  website: 4,
  operations: 3,
};

function taskStudioMap(workspace: VentureWorkspace): Map<string, StudioKind> {
  const scopes = new Map(
    workspace.studioScopes.map((scope) => [scope.studioScopeId, scope.studio]),
  );
  const result = new Map<string, StudioKind>();
  for (const edge of workspace.graphEdges) {
    if (
      edge.fromEntityType === "task" &&
      edge.relation === "implements" &&
      edge.toEntityType === "studio-scope"
    ) {
      const studio = scopes.get(edge.toEntityId);
      if (studio) result.set(edge.fromEntityId, studio);
    }
  }
  return result;
}

function taskDependencies(workspace: VentureWorkspace, task: Task): string[] {
  return workspace.graphEdges
    .filter(
      (edge) =>
        edge.fromEntityType === "task" &&
        edge.fromEntityId === task.taskId &&
        edge.relation === "depends-on" &&
        edge.toEntityType === "task",
    )
    .map((edge) => edge.toEntityId);
}

export function createWorkspaceProductionFabric(
  workspace: VentureWorkspace,
  options: WorkspaceProductionPlanOptions = {},
): ProductionPlan {
  const studioByTask = taskStudioMap(workspace);
  const approvalRequired = new Set(options.approvalRequiredTaskIds ?? []);
  const artifactIdsByTask = new Map<string, string[]>();
  for (const edge of workspace.graphEdges) {
    if (
      edge.fromEntityType === "task" &&
      edge.relation === "produces" &&
      edge.toEntityType === "artifact"
    ) {
      const ids = artifactIdsByTask.get(edge.fromEntityId) ?? [];
      ids.push(edge.toEntityId);
      artifactIdsByTask.set(edge.fromEntityId, ids);
    }
  }

  const jobs = workspace.tasks.map((task) => {
    const studio = studioByTask.get(task.taskId);
    if (!studio) {
      throw new Error(
        `Task ${task.taskId} is not linked to a studio scope with an implements edge.`,
      );
    }
    return {
      id: task.taskId,
      title: task.title,
      lane: studio,
      dependsOn: taskDependencies(workspace, task),
      estimatedEffort: studioEffort[studio],
      replicas: options.replicasByStudio?.[studio] ?? 1,
      approvalRequired: approvalRequired.has(task.taskId),
      metadata: {
        ventureId: workspace.venture.ventureId,
        workflowId: task.workflowId,
        studio,
        artifactIds: artifactIdsByTask.get(task.taskId) ?? [],
        completionCriteria: task.completionCriteria,
      },
    } satisfies ProductionJob;
  });

  return planProductionFabric({
    id: options.id || `${workspace.venture.ventureId}:production-fabric`,
    title:
      options.title || `${workspace.venture.name} layered studio production`,
    jobs,
    maxConcurrency: options.maxConcurrency,
    maxReplicasPerJob: options.maxReplicasPerJob,
    approvedJobIds: options.approvedTaskIds,
  });
}
