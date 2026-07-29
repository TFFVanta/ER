export { summarizeVenture } from "./ops.js";
export type { VentureOpsSummary } from "./ops.js";
export { auditBrand } from "./brand-audit.js";
export type { BrandFinding } from "./brand-audit.js";
export { readLedger } from "./finance.js";
export type { FinanceSummary, LedgerEntry } from "./finance.js";
export { readRepoHealth } from "./repo-health.js";
export type { RepoHealth } from "./repo-health.js";

export const identity = {
  name: "@exotic/company-engine",
  tagline: "Advise and surface - the human decides.",
};
