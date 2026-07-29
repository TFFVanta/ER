import fs from "node:fs";
import path from "node:path";

export interface VentureOpsSummary {
  name: string;
  hasBridge: boolean;
  stepCounts?: Record<string, number>;
  totalSteps?: number;
  autoMode?: string;
  status?: string;
  lastUpdate?: string;
  blockers?: unknown[];
}

interface RoadmapStep {
  status: string;
}

/** Reads a venture's bridge roadmap/state files - never writes, never takes action. */
export function summarizeVenture(options: { name: string; bridgeRoot: string }): VentureOpsSummary {
  const { name, bridgeRoot } = options;
  const roadmapFile = path.join(bridgeRoot, "roadmap.json");
  const stateFile = path.join(bridgeRoot, "state.json");

  if (!fs.existsSync(roadmapFile) && !fs.existsSync(stateFile)) {
    return { name, hasBridge: false };
  }

  const summary: VentureOpsSummary = { name, hasBridge: true };

  if (fs.existsSync(roadmapFile)) {
    const roadmap: RoadmapStep[] = JSON.parse(fs.readFileSync(roadmapFile, "utf8"));
    const stepCounts: Record<string, number> = {};
    for (const step of roadmap) {
      stepCounts[step.status] = (stepCounts[step.status] ?? 0) + 1;
    }
    summary.stepCounts = stepCounts;
    summary.totalSteps = roadmap.length;
  }

  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    summary.autoMode = state.autoMode;
    summary.status = state.status;
    summary.lastUpdate = state.updatedAt;
    summary.blockers = state.blockers ?? [];
  }

  return summary;
}
