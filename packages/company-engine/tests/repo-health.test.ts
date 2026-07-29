import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readRepoHealth } from "../src/repo-health.js";

function makeGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "company-engine-repo-health-"));
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "README.md"), "hello");
  execFileSync("git", ["add", "README.md"], { cwd: dir });
  execFileSync("git", ["commit", "--quiet", "-m", "init"], { cwd: dir });
  return dir;
}

describe("readRepoHealth", () => {
  it("reports branch and a clean working tree", () => {
    const dir = makeGitRepo();
    const health = readRepoHealth({
      repoRoot: dir,
      verificationJsonPath: path.join(dir, "does-not-exist.json"),
    });
    expect(health.branch).toBe("main");
    expect(health.uncommittedFiles).toBe(0);
    expect(health.lastVerification.hasData).toBe(false);
  });

  it("counts uncommitted files", () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, "new-file.txt"), "content");
    fs.writeFileSync(path.join(dir, "another.txt"), "content");
    const health = readRepoHealth({
      repoRoot: dir,
      verificationJsonPath: path.join(dir, "does-not-exist.json"),
    });
    expect(health.uncommittedFiles).toBe(2);
  });

  it("reads real build/test totals from a verification.json file", () => {
    const dir = makeGitRepo();
    const verificationPath = path.join(dir, "verification.json");
    fs.writeFileSync(
      verificationPath,
      JSON.stringify({
        verifiedAt: "2026-07-29T00:00:00Z",
        status: "failed",
        build: { passed: 27, total: 27 },
        test: { passed: 28, total: 28 },
      }),
    );
    const health = readRepoHealth({ repoRoot: dir, verificationJsonPath: verificationPath });
    expect(health.lastVerification).toEqual({
      hasData: true,
      verifiedAt: "2026-07-29T00:00:00Z",
      status: "failed",
      buildPassed: 27,
      buildTotal: 27,
      testPassed: 28,
      testTotal: 28,
    });
  });
});
