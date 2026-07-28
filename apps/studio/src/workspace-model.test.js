import { describe, expect, it } from "vitest";
import { buildWorkspaceModel, relatedEntities } from "./workspace-model.js";

function fixture() {
  return {
    schemaVersion: "1.0.0",
    venture: { ventureId: "V-1", name: "Test venture", status: "active" },
    objectives: [{ objectiveId: "OBJ-1", title: "Ship", status: "active" }],
    studioScopes: [
      {
        studioScopeId: "SCOPE-IDEAS",
        studio: "ideas",
        status: "active",
        objectiveIds: ["OBJ-1"],
      },
    ],
    workflows: [],
    tasks: [{ taskId: "TASK-1", title: "Frame opportunity", status: "active" }],
    artifacts: [
      {
        artifactId: "ART-IDEAS",
        title: "Opportunity brief",
        status: "proposed",
      },
    ],
    evidenceRecords: [],
    decisions: [],
    approvals: [],
    resources: [],
    metrics: [],
    memoryRecords: [],
    graphEdges: [
      {
        fromEntityType: "task",
        fromEntityId: "TASK-1",
        relation: "implements",
        toEntityType: "studio-scope",
        toEntityId: "SCOPE-IDEAS",
      },
      {
        fromEntityType: "task",
        fromEntityId: "TASK-1",
        relation: "produces",
        toEntityType: "artifact",
        toEntityId: "ART-IDEAS",
      },
    ],
    outputManifest: [{ output: "venture-record", entityIds: ["V-1"] }],
  };
}

describe("unified workspace shell model", () => {
  it("derives studio work from canonical graph edges", () => {
    const model = buildWorkspaceModel(fixture());
    const ideas = model.studios.find((studio) => studio.id === "ideas");

    expect(ideas.tasks.map((task) => task.taskId)).toEqual(["TASK-1"]);
    expect(ideas.artifacts.map((artifact) => artifact.artifactId)).toEqual([
      "ART-IDEAS",
    ]);
    expect(ideas.objectives.map((objective) => objective.objectiveId)).toEqual([
      "OBJ-1",
    ]);
  });

  it("uses graph relationships for the shared inspector", () => {
    const model = buildWorkspaceModel(fixture());
    expect(relatedEntities(model, "TASK-1").map((entity) => entity.id)).toEqual(
      ["SCOPE-IDEAS", "ART-IDEAS"],
    );
  });

  it("rejects disconnected non-workspace payloads", () => {
    expect(() => buildWorkspaceModel({})).toThrow(
      /canonical venture workspace/i,
    );
  });
});
