import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gatherCompanyStatus } from "../src/status.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("gatherCompanyStatus", () => {
  it("composes all four modules against the real repo", () => {
    const status = gatherCompanyStatus(repoRoot);
    expect(status.ventures.length).toBeGreaterThan(0);
    expect(status.ventures.map((v) => v.name)).toContain("EXOTIC");
    expect(status.brandFindings.length).toBeGreaterThan(0);
    expect(status.finance).toHaveProperty("hasData");
    expect(status.repoHealth).toHaveProperty("uncommittedFiles");
  });
});
