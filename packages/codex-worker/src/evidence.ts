import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// A snapshot of `git status --porcelain`, keyed by path, so evidence capture can compute
// what actually changed during a dispatch instead of attributing a pre-existing dirty
// working tree to the worker that just ran.
export interface WorkingTreeSnapshot {
  entries: Map<string, string>;
  fingerprints: Map<string, string>;
}

function fingerprintFile(cwd: string, relativePath: string): string {
  const filePath = path.join(cwd, relativePath.split(" -> ").at(-1) ?? relativePath);
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) return `link:${fs.readlinkSync(filePath)}`;
    if (!stat.isFile()) return `${stat.mode}:${stat.size}:${stat.mtimeMs}`;
    return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return "missing";
  }
}

export function snapshotWorkingTree(cwd: string): WorkingTreeSnapshot {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd,
    encoding: "utf8",
  });
  const entries = new Map<string, string>();
  const fingerprints = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const relativePath = line.slice(3).trim();
    entries.set(relativePath, line.slice(0, 2));
    fingerprints.set(relativePath, fingerprintFile(cwd, relativePath));
  }
  return { entries, fingerprints };
}

export interface CaptureEvidenceOptions {
  cwd: string;
  before: WorkingTreeSnapshot;
  testSummary?: string;
}

// Evidence is the list of paths whose git status changed between the pre-dispatch and
// post-dispatch snapshots, plus an optional test-run summary. This is what backs the
// `evidence: string[]` a ProductionReceipt must carry - see packages/workflow's
// receiptEvidence(), which throws if this comes back empty.
export function captureEvidence({
  cwd,
  before,
  testSummary,
}: CaptureEvidenceOptions): string[] {
  const after = snapshotWorkingTree(cwd);
  const evidence: string[] = [];

  for (const [path, status] of after.entries) {
    if (
      before.entries.get(path) !== status ||
      before.fingerprints.get(path) !== after.fingerprints.get(path)
    ) {
      evidence.push(`${status.trim() || "changed"} ${path}`);
    }
  }
  for (const path of before.entries.keys()) {
    if (!after.entries.has(path)) {
      evidence.push(`resolved ${path}`);
    }
  }
  if (testSummary && testSummary.trim()) {
    evidence.push(`test: ${testSummary.trim()}`);
  }

  return evidence;
}

export interface CommandEvidenceResult {
  summary: string;
  passed: boolean;
}

// Runs a verification command (e.g. a package's test script) and produces a short,
// human-readable summary suitable for attaching as evidence. Never throws - a failed
// command is itself meaningful evidence, not an error in the evidence-capture process.
export function runCommandForEvidence(
  cwd: string,
  command: string,
  args: readonly string[],
): CommandEvidenceResult {
  try {
    const output = execFileSync(command, [...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const lastLine = output.trim().split(/\r?\n/).slice(-1)[0] ?? "no output";
    return { summary: `${command} ${args.join(" ")} - passed - ${lastLine}`, passed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      summary: `${command} ${args.join(" ")} - failed - ${message.split(/\r?\n/)[0]}`,
      passed: false,
    };
  }
}
