export { captureEvidence, runCommandForEvidence, snapshotWorkingTree } from "./evidence.js";
export type { CaptureEvidenceOptions, CommandEvidenceResult, WorkingTreeSnapshot } from "./evidence.js";

export { claudeBackend, codexBackend, localBackend, resolveBackend } from "./backends.js";
export type { BackendName, CliBackendOptions, LocalBackendOptions } from "./backends.js";

export { applyFileEdits, LOCAL_EDIT_FORMAT_PROMPT, parseFileEdits } from "./apply-edits.js";
export type { AppliedEdit, ApplyFileEditsResult, FileEdit } from "./apply-edits.js";

export { dispatchStep } from "./dispatch.js";
export type { DispatchOptions, DispatchResult, RoadmapStepInput } from "./dispatch.js";

export {
  DEV_ADMIN_IDENTITY,
  DevAdminLeaseStore,
  cleanupIsolatedExecution,
  createIsolatedExecution,
  ensureDevAdminCredentials,
  integrateIsolatedExecution,
  verifyDevAdminToken,
} from "./dev-admin.js";
export type {
  DevAdminCredentials,
  DevAdminLease,
  DevAdminLeaseAcquireInput,
  IntegrationResult,
  IsolatedExecution,
} from "./dev-admin.js";

export const identity = {
  name: "@exotic/codex-worker",
  tagline: "Everything Is Exotic.",
};
