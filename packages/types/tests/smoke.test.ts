import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  artifactTypes,
  graphRelationTypes,
  requiredGeneratedWorkspaceArtifacts,
  studioKinds,
  ventureStatuses,
  ventureTypes,
  ventureWorkspaceSchemaVersion,
} from "../src/index.js";

describe("types package smoke", () => {
  it("has a valid Exotic package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("@exotic/types");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exports the canonical venture enums", () => {
    expect(ventureStatuses).toContain("completed");
    expect(ventureTypes).toContain("software-product");
    expect(studioKinds).toContain("operations");
    expect(artifactTypes).toContain("product-requirements");
    expect(graphRelationTypes).toContain("verifies");
    expect(ventureWorkspaceSchemaVersion).toBe("1.0.0");
  });

  it("defines the minimum generated workspace outputs", () => {
    expect(requiredGeneratedWorkspaceArtifacts).toContain("approvals-queue");
    expect(requiredGeneratedWorkspaceArtifacts).toContain("evidence-scaffold");
  });
});
