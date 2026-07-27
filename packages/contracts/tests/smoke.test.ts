import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { requiredGeneratedWorkspaceArtifacts } from "@exotic/types";
import {
  assertRequiredFields,
  findMissingRequiredFields,
  requiredFieldsFor,
  ventureWorkspaceContract,
} from "../src/index.js";

function validWorkspace(): Record<string, unknown> {
  const now = "2026-07-26T00:00:00.000Z";
  return {
    schemaVersion: "1.0.0",
    generatedAt: now,
    venture: {
      ventureId: "V-TEST",
      name: "Test venture",
      type: "business",
      status: "active",
      thesis: "Prove the canonical contract.",
      operator: "operator",
      createdAt: now,
      updatedAt: now,
    },
    objectives: [],
    studioScopes: [],
    workflows: [],
    tasks: [],
    artifacts: [],
    evidenceRecords: [],
    decisions: [],
    approvals: [],
    resources: [],
    metrics: [],
    memoryRecords: [],
    graphEdges: [],
    outputManifest: requiredGeneratedWorkspaceArtifacts.map((output) => ({
      output,
      entityIds: ["V-TEST"],
    })),
  };
}

describe("contracts package smoke", () => {
  it("has a valid Exotic package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("@exotic/contracts");
    expect(pkg.version).toBe("0.1.0");
  });

  it("exposes required venture entity fields", () => {
    expect(requiredFieldsFor("venture")).toContain("ventureId");
    expect(requiredFieldsFor("artifact")).toContain("location");
  });

  it("detects missing required fields", () => {
    expect(findMissingRequiredFields("venture", { name: "EXOTIC" })).toContain(
      "ventureId",
    );
    expect(() =>
      assertRequiredFields("objective", { objectiveId: "OBJ-1" }),
    ).toThrow(/missing required fields/i);
  });

  it("guards and parses the canonical venture workspace structure", () => {
    expect(() => ventureWorkspaceContract.parse({ venture: {} })).toThrow(
      /missing top-level fields/i,
    );
    expect(() =>
      ventureWorkspaceContract.parse(validWorkspace()),
    ).not.toThrow();
  });

  it("rejects broken graph references and duplicate identifiers", () => {
    const workspace = validWorkspace();
    workspace.objectives = [
      {
        objectiveId: "V-TEST",
        ventureId: "V-TEST",
        title: "Duplicate identity",
        summary: "This must fail.",
        owner: "operator",
        priority: "high",
        status: "active",
        successCriteria: [],
        dueContext: "Now",
        createdAt: workspace.generatedAt,
        updatedAt: workspace.generatedAt,
      },
    ];
    expect(() => ventureWorkspaceContract.parse(workspace)).toThrow(
      /globally unique/i,
    );
  });

  it("requires blocker details and verified evidence for lifecycle claims", () => {
    const blocked = validWorkspace();
    (blocked.venture as Record<string, unknown>).status = "blocked";
    expect(() => ventureWorkspaceContract.parse(blocked)).toThrow(/blocker/i);

    const completed = validWorkspace();
    (completed.venture as Record<string, unknown>).status = "completed";
    expect(() => ventureWorkspaceContract.parse(completed)).toThrow(
      /verified evidence/i,
    );
  });

  it("rejects approvals without one unambiguous target", () => {
    const workspace = validWorkspace();
    workspace.approvals = [
      {
        approvalId: "APR-1",
        ventureId: "V-TEST",
        requestedBy: "codex",
        requiredByRole: "operator",
        status: "proposed",
        createdAt: workspace.generatedAt,
        updatedAt: workspace.generatedAt,
      },
    ];
    expect(() => ventureWorkspaceContract.parse(workspace)).toThrow(
      /exactly one/i,
    );
  });

  it("requires every minimum generated workspace output", () => {
    const workspace = validWorkspace();
    workspace.outputManifest = (workspace.outputManifest as unknown[]).slice(1);
    expect(() => ventureWorkspaceContract.parse(workspace)).toThrow(
      /missing required outputs/i,
    );
  });
});
