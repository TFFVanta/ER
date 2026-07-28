import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { ventureWorkspaceContract } from "@exotic/contracts";
import { requiredGeneratedWorkspaceArtifacts } from "@exotic/types";
import { createWorkspaceProductionFabric } from "@exotic/workflow";
import { appendEvidenceRecord, createVentureWorkspace, summarizeWorkspace } from "../src/index.js";

function workspaceIds(
  workspace: ReturnType<typeof createVentureWorkspace>,
): string[] {
  return [
    workspace.venture.ventureId,
    ...workspace.objectives.map((item) => item.objectiveId),
    ...workspace.studioScopes.map((item) => item.studioScopeId),
    ...workspace.workflows.map((item) => item.workflowId),
    ...workspace.tasks.map((item) => item.taskId),
    ...workspace.artifacts.map((item) => item.artifactId),
    ...workspace.evidenceRecords.map((item) => item.evidenceId),
    ...workspace.decisions.map((item) => item.decisionId),
    ...workspace.approvals.map((item) => item.approvalId),
    ...workspace.resources.map((item) => item.resourceId),
    ...workspace.metrics.map((item) => item.metricId),
    ...workspace.memoryRecords.map((item) => item.memoryId),
    ...workspace.graphEdges.map((item) => item.edgeId),
  ];
}

describe("entity package smoke", () => {
  it("has a valid Exotic package manifest", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("@exotic/entity");
    expect(pkg.version).toBe("0.1.0");
  });

  it("generates a structured EXOTIC venture workspace from a broad request", () => {
    const workspace = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });

    expect(workspace.venture.ventureId).toMatch(/^V-/);
    expect(workspace.objectives.length).toBeGreaterThanOrEqual(2);
    expect(workspace.studioScopes.length).toBe(10);
    expect(workspace.artifacts.length).toBe(10);
    expect(workspace.workflows[0]?.title).toMatch(/foundation/i);
    expect(workspace.memoryRecords[0]?.summary).toBe("build this business");
    expect(workspace.graphEdges.length).toBeGreaterThan(40);
    expect(
      workspace.graphEdges.filter(
        (edge) =>
          edge.fromEntityType === "task" && edge.relation === "implements",
      ),
    ).toHaveLength(10);
    expect(
      workspace.graphEdges.filter(
        (edge) =>
          edge.fromEntityType === "task" && edge.relation === "depends-on",
      ).length,
    ).toBeGreaterThan(8);
    expect(workspace.outputManifest.map((item) => item.output)).toEqual(
      requiredGeneratedWorkspaceArtifacts,
    );
    expect(() => ventureWorkspaceContract.parse(workspace)).not.toThrow();
  });

  it("creates globally unique venture-scoped entity and graph identifiers", () => {
    const first = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });
    const second = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-27T00:00:00.000Z",
    });
    const firstIds = workspaceIds(first);
    const secondIds = workspaceIds(second);

    expect(new Set(firstIds).size).toBe(firstIds.length);
    expect(new Set(secondIds).size).toBe(secondIds.length);
    expect(secondIds.some((id) => new Set(firstIds).has(id))).toBe(false);
  });

  it("summarizes the generated workspace for quick inspection", () => {
    const workspace = createVentureWorkspace({
      request: "launch a serious AI-native workspace",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });

    expect(summarizeWorkspace(workspace)).toContain("10 studio scopes");
    expect(summarizeWorkspace(workspace)).toContain("artifacts");
  });

  it("projects the canonical task graph into parallel studio production layers", () => {
    const workspace = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });
    const plan = createWorkspaceProductionFabric(workspace, {
      maxConcurrency: 4,
    });

    expect(
      plan.layers.map((layer) => layer.swarms.map((swarm) => swarm.lane)),
    ).toEqual([
      ["ideas", "research"],
      ["business"],
      ["product"],
      ["design", "development", "marketing", "workflows"],
      ["website"],
      ["operations"],
    ]);
    expect(plan.metrics).toMatchObject({
      totalJobs: 10,
      scheduledJobs: 10,
      dependencyLayers: 6,
      maximumParallelJobs: 4,
    });
    expect(plan.jobs.every((job) => job.metadata?.artifactIds)).toBe(true);
  });

  it("appends a verified evidence record for a real task and re-validates the workspace", () => {
    const workspace = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });
    const task = workspace.tasks[0];

    const next = appendEvidenceRecord(workspace, {
      relatedEntityType: "task",
      relatedEntityId: task.taskId,
      evidenceType: "runtime-log",
      source: "worker dispatch produced 1 changed file",
      now: "2026-07-26T01:00:00.000Z",
    });

    expect(next.evidenceRecords.length).toBe(workspace.evidenceRecords.length + 1);
    const added = next.evidenceRecords[next.evidenceRecords.length - 1];
    expect(added.relatedEntityId).toBe(task.taskId);
    expect(added.verdict).toBe("verified");
    expect(() => ventureWorkspaceContract.parse(next)).not.toThrow();
  });

  it("rejects an evidence record pointing at a nonexistent entity", () => {
    const workspace = createVentureWorkspace({
      request: "build this business",
      operator: "wakez",
      now: "2026-07-26T00:00:00.000Z",
    });

    expect(() =>
      appendEvidenceRecord(workspace, {
        relatedEntityType: "task",
        relatedEntityId: "TASK-DOES-NOT-EXIST",
        evidenceType: "runtime-log",
        source: "should fail",
      }),
    ).toThrow();
  });
});
