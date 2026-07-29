import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// The full contract here was reverse-derived from its actual call sites in
// codex-bridge-runtime.mjs (devAdminStatus, dispatchActiveStep, the /api/v1/bridge/dev-admin*
// routes) rather than designed fresh - this file makes those existing call sites load and
// behave correctly, it doesn't invent new API shape.

export const DEV_ADMIN_IDENTITY = {
  name: "AI Dev Admin",
  description:
    "Autonomous local operator that drafts, verifies, and integrates isolated candidate " +
    "changes in a disposable git worktree. No remote push, deploy, secrets, or financial " +
    "authority - see devAdminStatus().authority in codex-bridge-runtime.mjs.",
};

// ---- Credentials ----

export interface DevAdminCredentials {
  token: string;
  createdAt: string;
}

// Generates a bearer token on first run and persists it - isDevAdminAuthorized() compares
// incoming requests against this. Never transmitted anywhere; local-file-only, matching the
// "local bridge origin required" gate already enforced by the HTTP layer above this.
export function ensureDevAdminCredentials(credentialFile: string): DevAdminCredentials {
  if (fs.existsSync(credentialFile)) {
    return JSON.parse(fs.readFileSync(credentialFile, "utf8"));
  }
  const credentials: DevAdminCredentials = {
    token: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(credentialFile), { recursive: true });
  fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2));
  return credentials;
}

export function verifyDevAdminToken(expected: string | undefined, provided: string | undefined): boolean {
  if (!expected || !provided) return false;
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// ---- Lease store ----

export interface DevAdminLease {
  executionId: string;
  stepId: string;
  branch: string;
  worktreePath: string;
  status: string;
  attempt: number;
  startedAt: string;
  heartbeatAt: string;
  expiresAt: string;
}

export interface DevAdminLeaseAcquireInput {
  executionId: string;
  stepId: string;
  branch: string;
  worktreePath: string;
  status: string;
  attempt: number;
}

// Single-slot lease (this codebase only ever dispatches one step at a time - see
// dispatchActiveStep's sequential await chain), persisted to disk so a bridge restart doesn't
// forget an in-flight isolated execution.
export class DevAdminLeaseStore {
  #leaseFile: string;
  #ttlMs: number;

  constructor(leaseFile: string, ttlMs: number) {
    this.#leaseFile = leaseFile;
    this.#ttlMs = ttlMs;
  }

  read(): DevAdminLease | null {
    if (!fs.existsSync(this.#leaseFile)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.#leaseFile, "utf8"));
    } catch {
      return null;
    }
  }

  #write(lease: DevAdminLease | null): void {
    fs.mkdirSync(path.dirname(this.#leaseFile), { recursive: true });
    if (lease === null) {
      fs.rmSync(this.#leaseFile, { force: true });
      return;
    }
    fs.writeFileSync(this.#leaseFile, JSON.stringify(lease, null, 2));
  }

  acquire(data: DevAdminLeaseAcquireInput): DevAdminLease {
    const now = new Date();
    const lease: DevAdminLease = {
      ...data,
      startedAt: now.toISOString(),
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.#ttlMs).toISOString(),
    };
    this.#write(lease);
    return lease;
  }

  heartbeat(executionId: string, status?: string): DevAdminLease {
    const lease = this.read();
    if (!lease || lease.executionId !== executionId) {
      throw new Error(`No active lease for execution ${executionId} - it may have been lost or recovered.`);
    }
    const now = new Date();
    const updated: DevAdminLease = {
      ...lease,
      status: status ?? lease.status,
      heartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.#ttlMs).toISOString(),
    };
    this.#write(updated);
    return updated;
  }

  release(executionId: string): void {
    const lease = this.read();
    if (lease && lease.executionId === executionId) {
      this.#write(null);
    }
  }

  // Called at startup: a lease left past its expiry (e.g. the bridge process died mid-run)
  // would otherwise block every future dispatch forever - clear it and report what was lost.
  recoverExpired(): { executionId: string; stepId: string; recoveredAt: string } | null {
    const lease = this.read();
    if (!lease) return null;
    if (new Date(lease.expiresAt).getTime() > Date.now()) return null;
    this.#write(null);
    return { executionId: lease.executionId, stepId: lease.stepId, recoveredAt: new Date().toISOString() };
  }
}

// ---- Isolated execution (git worktrees) ----

export interface IsolatedExecution {
  executionId: string;
  stepId: string;
  branch: string;
  worktreePath: string;
  baseRef: string;
}

function runGit(args: readonly string[], cwd: string): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim();
}

// Creates a disposable git worktree on a fresh branch off the repo's current HEAD - the
// backend CLI (claude/codex/local) then runs with cwd set to this worktree, so nothing it does
// touches the operator's real working tree until integrateIsolatedExecution explicitly merges.
export function createIsolatedExecution(
  repoRoot: string,
  worktreeRoot: string,
  stepId: string,
): IsolatedExecution {
  const executionId = `${stepId}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const branch = `dev-admin/${executionId}`;
  const worktreePath = path.join(worktreeRoot, executionId);
  const baseRef = runGit(["rev-parse", "HEAD"], repoRoot);

  fs.mkdirSync(worktreeRoot, { recursive: true });
  runGit(["worktree", "add", "-b", branch, worktreePath, baseRef], repoRoot);

  return { executionId, stepId, branch, worktreePath, baseRef };
}

export function cleanupIsolatedExecution(repoRoot: string, execution: IsolatedExecution): void {
  try {
    runGit(["worktree", "remove", "--force", execution.worktreePath], repoRoot);
  } catch {
    fs.rmSync(execution.worktreePath, { recursive: true, force: true });
  }
  try {
    runGit(["branch", "-D", execution.branch], repoRoot);
  } catch {
    // Branch may already be gone or never received a commit - not fatal.
  }
}

export interface IntegrationResult {
  integrated: string[];
  blocked: string[];
  conflicts: string[];
}

// Merges the worktree's committed changes into repoRoot's currently checked-out branch.
// Local-only - devAdminStatus().authority declares remotePush:false, and this function never
// runs `git push`. A conflict aborts the merge cleanly, leaving repoRoot exactly as it was
// before the attempt, rather than stuck mid-merge.
export function integrateIsolatedExecution(repoRoot: string, execution: IsolatedExecution): IntegrationResult {
  const dirty = runGit(["status", "--porcelain"], execution.worktreePath);
  if (dirty) {
    return {
      integrated: [],
      blocked: [`worktree has uncommitted changes: ${dirty.split(/\r?\n/).filter(Boolean).length} file(s)`],
      conflicts: [],
    };
  }

  const commitCount = runGit(["rev-list", "--count", `${execution.baseRef}..${execution.branch}`], repoRoot);
  if (commitCount === "0") {
    return { integrated: [], blocked: ["no commits were made in the isolated worktree"], conflicts: [] };
  }

  try {
    runGit(["merge", "--no-ff", "--no-edit", execution.branch], repoRoot);
  } catch (error) {
    let conflicts: string[] = [];
    try {
      conflicts = runGit(["diff", "--name-only", "--diff-filter=U"], repoRoot)
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      // best-effort - fall through to the raw error message below
    }
    try {
      runGit(["merge", "--abort"], repoRoot);
    } catch {
      // best-effort
    }
    const message = error instanceof Error ? error.message : String(error);
    return { integrated: [], blocked: [], conflicts: conflicts.length ? conflicts : [message] };
  }

  const integrated = runGit(["diff", "--name-only", `${execution.baseRef}..HEAD`], repoRoot)
    .split(/\r?\n/)
    .filter(Boolean);

  return { integrated, blocked: [], conflicts: [] };
}
