import path from "node:path";
import { summarizeVenture, type VentureOpsSummary } from "./ops.js";
import { auditBrand, type BrandFinding } from "./brand-audit.js";
import { readLedger, type FinanceSummary } from "./finance.js";
import { readRepoHealth, type RepoHealth } from "./repo-health.js";
import { ventureRegistry } from "./ventures.js";

export interface CompanyStatus {
  ventures: VentureOpsSummary[];
  brandFindings: BrandFinding[];
  finance: FinanceSummary;
  repoHealth: RepoHealth;
}

// The single composition of every company-engine module - previously this exact assembly
// (registry -> per-venture bridgeRoot resolution -> the 4 module calls) lived only as
// procedural code inside apps/forge's CLI, unreachable from anywhere else (like the
// status-page renderer, which needs the identical data shape).
export function gatherCompanyStatus(repoRoot: string): CompanyStatus {
  const ventures = ventureRegistry.map((entry) => {
    const override = entry.bridgeRootEnvVar && process.env[entry.bridgeRootEnvVar];
    const bridgeRoot = override || path.join(repoRoot, ".exotic", entry.bridgeDirName);
    return summarizeVenture({ name: entry.name, bridgeRoot });
  });

  const brandFindings = auditBrand({
    exoticUiStylesPath: path.join(repoRoot, "packages", "ui", "src", "styles.css"),
    remedyUiStylesPath: path.join(repoRoot, "packages", "ui-remedy", "src", "styles.css"),
  });

  const finance = readLedger(path.join(repoRoot, ".exotic", "company", "ledger.json"));

  const repoHealth = readRepoHealth({
    repoRoot,
    verificationJsonPath: path.join(repoRoot, ".exotic", "codex-bridge", "verification.json"),
  });

  return { ventures, brandFindings, finance, repoHealth };
}
