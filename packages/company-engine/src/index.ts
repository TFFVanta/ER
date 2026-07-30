export { summarizeVenture } from "./ops.js";
export type { VentureOpsSummary } from "./ops.js";
export { auditBrand } from "./brand-audit.js";
export type { BrandFinding } from "./brand-audit.js";
export { readLedger } from "./finance.js";
export type { FinanceSummary, LedgerEntry } from "./finance.js";
export { readRepoHealth } from "./repo-health.js";
export type { RepoHealth } from "./repo-health.js";
export { ventureRegistry } from "./ventures.js";
export type { VentureRegistryEntry } from "./ventures.js";
export { gatherCompanyStatus } from "./status.js";
export type { CompanyStatus } from "./status.js";
export { readLearningLabs } from "./learning.js";
export type { LearningSummary, LessonSummary } from "./learning.js";

export const identity = {
  name: "@exotic/company-engine",
  tagline: "Advise and surface - the human decides.",
};
