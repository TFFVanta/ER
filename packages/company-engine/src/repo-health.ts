import fs from "node:fs";
import { execFileSync } from "node:child_process";

export interface RepoHealth {
  branch: string | null;
  uncommittedFiles: number;
  aheadBehind: string | null;
  lastVerification: {
    hasData: boolean;
    verifiedAt?: string;
    status?: string;
    buildPassed?: number;
    buildTotal?: number;
    testPassed?: number;
    testTotal?: number;
  };
}

function runGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/**
 * Real, local, verifiable-right-now signals only: `git status`/`git rev-list` for working-tree
 * state, and the most recent tooling/record-verification.mjs output for build/test health.
 * Never runs a build itself - reads what already ran, so this stays cheap and honest about
 * staleness (lastVerification.verifiedAt tells you how old the numbers are).
 */
export function readRepoHealth(options: { repoRoot: string; verificationJsonPath: string }): RepoHealth {
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], options.repoRoot);
  const statusOutput = runGit(["status", "--porcelain"], options.repoRoot);
  const uncommittedFiles = statusOutput ? statusOutput.split("\n").filter(Boolean).length : 0;
  const aheadBehind = runGit(["status", "--short", "--branch"], options.repoRoot);
  const aheadBehindLine = aheadBehind ? aheadBehind.split("\n")[0] : null;

  let lastVerification: RepoHealth["lastVerification"] = { hasData: false };
  if (fs.existsSync(options.verificationJsonPath)) {
    const data = JSON.parse(fs.readFileSync(options.verificationJsonPath, "utf8"));
    lastVerification = {
      hasData: true,
      verifiedAt: data.verifiedAt,
      status: data.status,
      buildPassed: data.build?.passed,
      buildTotal: data.build?.total,
      testPassed: data.test?.passed,
      testTotal: data.test?.total,
    };
  }

  return { branch, uncommittedFiles, aheadBehind: aheadBehindLine, lastVerification };
}
