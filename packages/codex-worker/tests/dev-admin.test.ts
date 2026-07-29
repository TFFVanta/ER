import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DevAdminLeaseStore,
  cleanupIsolatedExecution,
  createIsolatedExecution,
  ensureDevAdminCredentials,
  integrateIsolatedExecution,
  verifyDevAdminToken,
} from "../src/dev-admin.js";

function runGit(args: readonly string[], cwd: string): string {
  return execFileSync("git", [...args], { cwd, encoding: "utf8" }).trim();
}

function makeGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-admin-test-"));
  runGit(["init", "--quiet", "--initial-branch=main"], dir);
  runGit(["config", "user.email", "test@example.com"], dir);
  runGit(["config", "user.name", "Test"], dir);
  fs.writeFileSync(path.join(dir, "README.md"), "hello\n");
  runGit(["add", "README.md"], dir);
  runGit(["commit", "--quiet", "-m", "init"], dir);
  return dir;
}

describe("ensureDevAdminCredentials", () => {
  it("generates a token once and reuses it on subsequent calls", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-admin-creds-"));
    const file = path.join(dir, "credentials.json");
    const first = ensureDevAdminCredentials(file);
    const second = ensureDevAdminCredentials(file);
    expect(first.token).toBe(second.token);
    expect(first.token).toHaveLength(64);
  });
});

describe("verifyDevAdminToken", () => {
  it("accepts the correct token and rejects everything else", () => {
    expect(verifyDevAdminToken("secret", "secret")).toBe(true);
    expect(verifyDevAdminToken("secret", "wrong")).toBe(false);
    expect(verifyDevAdminToken("secret", undefined)).toBe(false);
    expect(verifyDevAdminToken(undefined, "secret")).toBe(false);
  });
});

describe("DevAdminLeaseStore", () => {
  it("acquires, heartbeats, and releases a lease", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-admin-lease-"));
    const store = new DevAdminLeaseStore(path.join(dir, "lease.json"), 30_000);
    expect(store.read()).toBeNull();

    const lease = store.acquire({
      executionId: "exec-1",
      stepId: "P1-01",
      branch: "dev-admin/exec-1",
      worktreePath: "/tmp/exec-1",
      status: "running",
      attempt: 1,
    });
    expect(store.read()?.executionId).toBe("exec-1");

    const heartbeated = store.heartbeat("exec-1", "verifying");
    expect(heartbeated.status).toBe("verifying");

    expect(() => store.heartbeat("wrong-id")).toThrow();

    store.release("exec-1");
    expect(store.read()).toBeNull();
  });

  it("recovers an expired lease and leaves a fresh one alone", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-admin-lease-recover-"));
    const store = new DevAdminLeaseStore(path.join(dir, "lease.json"), 0);
    store.acquire({
      executionId: "exec-2",
      stepId: "P1-02",
      branch: "dev-admin/exec-2",
      worktreePath: "/tmp/exec-2",
      status: "running",
      attempt: 1,
    });
    const recovered = store.recoverExpired();
    expect(recovered?.executionId).toBe("exec-2");
    expect(store.read()).toBeNull();
    expect(store.recoverExpired()).toBeNull();
  });
});

describe("isolated execution lifecycle", () => {
  it("creates a worktree, integrates a real commit, then cleans up", () => {
    const repoRoot = makeGitRepo();
    const worktreeRoot = path.join(repoRoot, ".worktrees");

    const execution = createIsolatedExecution(repoRoot, worktreeRoot, "P1-01");
    expect(fs.existsSync(execution.worktreePath)).toBe(true);

    fs.writeFileSync(path.join(execution.worktreePath, "new-file.txt"), "content\n");
    runGit(["add", "new-file.txt"], execution.worktreePath);
    runGit(["commit", "--quiet", "-m", "add new-file.txt"], execution.worktreePath);

    const result = integrateIsolatedExecution(repoRoot, execution);
    expect(result.blocked).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.integrated).toContain("new-file.txt");
    expect(fs.existsSync(path.join(repoRoot, "new-file.txt"))).toBe(true);

    cleanupIsolatedExecution(repoRoot, execution);
    expect(fs.existsSync(execution.worktreePath)).toBe(false);
  });

  it("blocks integration when the worktree has uncommitted changes", () => {
    const repoRoot = makeGitRepo();
    const worktreeRoot = path.join(repoRoot, ".worktrees");
    const execution = createIsolatedExecution(repoRoot, worktreeRoot, "P1-02");

    fs.writeFileSync(path.join(execution.worktreePath, "dirty.txt"), "uncommitted\n");

    const result = integrateIsolatedExecution(repoRoot, execution);
    expect(result.integrated).toEqual([]);
    expect(result.blocked.length).toBeGreaterThan(0);

    cleanupIsolatedExecution(repoRoot, execution);
  });

  it("reports blocked when no commits were made", () => {
    const repoRoot = makeGitRepo();
    const worktreeRoot = path.join(repoRoot, ".worktrees");
    const execution = createIsolatedExecution(repoRoot, worktreeRoot, "P1-03");

    const result = integrateIsolatedExecution(repoRoot, execution);
    expect(result.integrated).toEqual([]);
    expect(result.blocked).toEqual(["no commits were made in the isolated worktree"]);

    cleanupIsolatedExecution(repoRoot, execution);
  });

  it("reports conflicts and leaves repoRoot clean when integration would conflict", () => {
    const repoRoot = makeGitRepo();
    const worktreeRoot = path.join(repoRoot, ".worktrees");
    const execution = createIsolatedExecution(repoRoot, worktreeRoot, "P1-04");

    // Conflicting edit to the same file in both the worktree and repoRoot.
    fs.writeFileSync(path.join(execution.worktreePath, "README.md"), "worktree version\n");
    runGit(["add", "README.md"], execution.worktreePath);
    runGit(["commit", "--quiet", "-m", "edit from worktree"], execution.worktreePath);

    fs.writeFileSync(path.join(repoRoot, "README.md"), "repoRoot version\n");
    runGit(["add", "README.md"], repoRoot);
    runGit(["commit", "--quiet", "-m", "edit from repoRoot"], repoRoot);

    const result = integrateIsolatedExecution(repoRoot, execution);
    expect(result.integrated).toEqual([]);
    expect(result.conflicts.length).toBeGreaterThan(0);

    // repoRoot must be left in a clean, non-mid-merge state: no unmerged paths and no
    // in-progress merge. (The lone ".worktrees/" untracked-directory line is test-fixture
    // scaffolding - in real usage that directory lives under the already-gitignored .exotic/.)
    const status = runGit(["status", "--porcelain"], repoRoot);
    expect(status).not.toMatch(/^(UU|AA|DD)/m);
    expect(fs.existsSync(path.join(repoRoot, ".git", "MERGE_HEAD"))).toBe(false);

    cleanupIsolatedExecution(repoRoot, execution);
  });
});
