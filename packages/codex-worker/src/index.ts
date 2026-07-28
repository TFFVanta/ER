export { captureEvidence, runCommandForEvidence, snapshotWorkingTree } from "./evidence.js";
export type { CaptureEvidenceOptions, CommandEvidenceResult, WorkingTreeSnapshot } from "./evidence.js";

export { claudeBackend, codexBackend, localBackend, resolveBackend } from "./backends.js";
export type { BackendName, CliBackendOptions, LocalBackendOptions } from "./backends.js";

export { dispatchStep } from "./dispatch.js";
export type { DispatchOptions, DispatchResult, RoadmapStepInput } from "./dispatch.js";

export const identity = {
  name: "@exotic/codex-worker",
  tagline: "Everything Is Exotic.",
};
