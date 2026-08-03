export const studioDefinitions = [
  { id: "ideas", label: "Ideas", code: "ID" },
  { id: "business", label: "Business", code: "BZ" },
  { id: "product", label: "Product", code: "PD" },
  { id: "design", label: "Design", code: "DS" },
  { id: "website", label: "Website", code: "WB" },
  { id: "development", label: "Development", code: "DV" },
  { id: "marketing", label: "Marketing", code: "MK" },
  { id: "research", label: "Research", code: "RS" },
  { id: "workflows", label: "Workflows", code: "WF" },
  { id: "operations", label: "Operations", code: "OP" },
];

const collections = [
  ["objective", "objectives", "objectiveId"],
  ["studio-scope", "studioScopes", "studioScopeId"],
  ["workflow", "workflows", "workflowId"],
  ["task", "tasks", "taskId"],
  ["artifact", "artifacts", "artifactId"],
  ["evidence-record", "evidenceRecords", "evidenceId"],
  ["decision", "decisions", "decisionId"],
  ["approval", "approvals", "approvalId"],
  ["resource", "resources", "resourceId"],
  ["metric", "metrics", "metricId"],
  ["memory-record", "memoryRecords", "memoryId"],
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function completionPercent(records) {
  if (!records.length) return 0;
  return Math.round(
    (records.filter((record) => record.status === "completed").length /
      records.length) *
      100,
  );
}

export function buildWorkspaceModel(workspace) {
  if (!workspace?.venture?.ventureId) {
    throw new Error("The bridge did not return a canonical venture workspace.");
  }

  const entityIndex = new Map();
  entityIndex.set(workspace.venture.ventureId, {
    type: "venture",
    id: workspace.venture.ventureId,
    record: workspace.venture,
  });

  for (const [type, field, idField] of collections) {
    for (const record of asArray(workspace[field])) {
      const id = record?.[idField];
      if (id) entityIndex.set(id, { type, id, record });
    }
  }

  const edges = asArray(workspace.graphEdges);
  const tasksByScope = new Map();
  const artifactsByTask = new Map();

  for (const edge of edges) {
    if (
      edge.fromEntityType === "task" &&
      edge.relation === "implements" &&
      edge.toEntityType === "studio-scope"
    ) {
      const taskIds = tasksByScope.get(edge.toEntityId) ?? [];
      taskIds.push(edge.fromEntityId);
      tasksByScope.set(edge.toEntityId, taskIds);
    }

    if (
      edge.fromEntityType === "task" &&
      edge.relation === "produces" &&
      edge.toEntityType === "artifact"
    ) {
      const artifactIds = artifactsByTask.get(edge.fromEntityId) ?? [];
      artifactIds.push(edge.toEntityId);
      artifactsByTask.set(edge.fromEntityId, artifactIds);
    }
  }

  const scopesByStudio = new Map(
    asArray(workspace.studioScopes).map((scope) => [scope.studio, scope]),
  );
  const artifactsByStudio = new Map(
    asArray(workspace.artifacts).map((artifact) => {
      const studio = artifact.artifactId
        ?.match(/-ART-([A-Z-]+)$/)?.[1]
        ?.toLowerCase();
      return [studio, artifact];
    }),
  );

  const studios = studioDefinitions.map((definition) => {
    const scope = scopesByStudio.get(definition.id) ?? null;
    const tasks = (tasksByScope.get(scope?.studioScopeId) ?? [])
      .map((id) => entityIndex.get(id)?.record)
      .filter(Boolean);
    const artifactIds = new Set(
      tasks.flatMap((task) => artifactsByTask.get(task.taskId) ?? []),
    );
    const artifacts = [...artifactIds]
      .map((id) => entityIndex.get(id)?.record)
      .filter(Boolean);

    if (!artifacts.length && artifactsByStudio.has(definition.id)) {
      artifacts.push(artifactsByStudio.get(definition.id));
    }

    const objectives = asArray(scope?.objectiveIds)
      .map((id) => entityIndex.get(id)?.record)
      .filter(Boolean);
    const entityIds = new Set(
      [
        scope?.studioScopeId,
        ...tasks.map((task) => task.taskId),
        ...artifacts.map((artifact) => artifact.artifactId),
      ].filter(Boolean),
    );
    const evidence = asArray(workspace.evidenceRecords).filter((record) =>
      entityIds.has(record.relatedEntityId),
    );
    const workRecords = [...tasks, ...artifacts];

    return {
      ...definition,
      scope,
      tasks,
      artifacts,
      objectives,
      evidence,
      entityIds,
      status: scope?.status ?? "unavailable",
      progress: completionPercent(workRecords),
      activeCount: workRecords.filter((record) => record.status === "active")
        .length,
      blockedCount: workRecords.filter((record) => record.status === "blocked")
        .length,
    };
  });

  const allWork = [
    ...asArray(workspace.tasks),
    ...asArray(workspace.artifacts),
  ];
  return {
    workspace,
    venture: workspace.venture,
    studios,
    entityIndex,
    edges,
    summary: {
      objectives: asArray(workspace.objectives).length,
      activeWork: allWork.filter((record) => record.status === "active").length,
      blockedWork: allWork.filter((record) => record.status === "blocked")
        .length,
      artifacts: asArray(workspace.artifacts).length,
      verifiedEvidence: asArray(workspace.evidenceRecords).filter(
        (record) => record.verdict === "verified",
      ).length,
      graphEdges: edges.length,
      outputCoverage: asArray(workspace.outputManifest).length,
    },
  };
}

export function relatedEntities(model, entityId) {
  if (!model || !entityId) return [];
  const ids = model.edges.flatMap((edge) => {
    if (edge.fromEntityId === entityId) return [edge.toEntityId];
    if (edge.toEntityId === entityId) return [edge.fromEntityId];
    return [];
  });
  return [...new Set(ids)]
    .map((id) => model.entityIndex.get(id))
    .filter(Boolean);
}

export const entityTypeLabels = {
  venture: "Venture",
  objective: "Objective",
  "studio-scope": "Studio Scope",
  workflow: "Workflow",
  task: "Task",
  artifact: "Artifact",
  "evidence-record": "Evidence Record",
  decision: "Decision",
  approval: "Approval",
  resource: "Resource",
  metric: "Metric",
  "memory-record": "Memory Record",
};

function shortId(id) {
  const segments = String(id).split("-");
  return segments[segments.length - 1] || id;
}

// Never surfaces a raw system ID (e.g. "V-PHASE-1-FOUNDATION-1OLBNFQ-STUDIO-IDEAS")
// as a UI heading - falls back to a readable type label instead, with a studio-specific
// label for studio scopes since those are the entities most likely to lack a title.
export function entityTitle(entity) {
  if (!entity) return "Nothing selected";
  const record = entity.record;
  if (record.title || record.name || record.summary) {
    return record.title || record.name || record.summary;
  }
  if (entity.type === "studio-scope" && record.studio) {
    const studio = studioDefinitions.find((item) => item.id === record.studio);
    if (studio) return `${studio.label} Studio Scope`;
  }
  const typeLabel = entityTypeLabels[entity.type] || "Object";
  return `${typeLabel} ${shortId(entity.id)}`;
}
