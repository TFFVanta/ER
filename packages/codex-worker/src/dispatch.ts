import type {
  ProductionCell,
  ProductionCellContext,
  ProductionJob,
  ProductionReceipt,
  ProductionWorker,
} from "@exotic/workflow";
import { type BackendName, type CliBackendOptions, type LocalBackendOptions, resolveBackend } from "./backends.js";

export interface RoadmapStepInput {
  id: string;
  title: string;
  lane?: string;
  dependsOn?: readonly string[];
}

export interface DispatchOptions extends Partial<CliBackendOptions>, Partial<LocalBackendOptions> {
  // A named backend (claude/codex/local), or a worker function supplied directly - the
  // latter is how tests exercise this pipeline without a real CLI/model call, and it's
  // equally useful for callers composing their own backend.
  backend: BackendName | ProductionWorker<string>;
  cwd: string;
  planId?: string;
}

export type DispatchResult =
  | { status: "completed"; receipt: ProductionReceipt<string> }
  | { status: "failed"; error: string };

// Dispatches a single roadmap step to the chosen backend and returns either an
// evidence-backed receipt or a structured failure - never throws, so callers (the CLI, the
// bridge auto-tick loop) can decide what to do with a failure without a try/catch at every
// call site. Mirrors packages/workflow's own receiptEvidence() check: a receipt with no
// evidence is treated as a failure here too, since an unevidenced "success" is exactly the
// completion-theater this adapter exists to prevent.
export async function dispatchStep(
  step: RoadmapStepInput,
  options: DispatchOptions,
): Promise<DispatchResult> {
  const job: ProductionJob = {
    id: step.id,
    title: step.title,
    lane: step.lane ?? "roadmap",
    dependsOn: step.dependsOn ?? [],
  };
  const cell: ProductionCell = {
    cellId: `${step.id}:cell-1`,
    jobId: step.id,
    lane: job.lane,
    replica: 1,
    role: "producer",
  };
  const context: ProductionCellContext = {
    planId: options.planId ?? "exotic-roadmap-production-fabric",
    layerIndex: 0,
    swarmId: `${job.lane}:swarm-1`,
    job,
    cell,
    attempt: 1,
  };

  let receipt: ProductionReceipt<string>;
  try {
    const worker: ProductionWorker<string> =
      typeof options.backend === "function"
        ? options.backend
        : resolveBackend(options.backend, {
            cwd: options.cwd,
            extraArgs: options.extraArgs,
            endpoint: options.endpoint,
            model: options.model,
          });
    receipt = await worker(context);
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }

  if (!receipt.evidence || receipt.evidence.length === 0) {
    return { status: "failed", error: "Worker returned no evidence for this step." };
  }

  return { status: "completed", receipt };
}
