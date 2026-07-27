import type {
  Approval,
  Artifact,
  Decision,
  EvidenceRecord,
  MemoryRecord,
  Metric,
  Objective,
  Resource,
  StudioKind,
  StudioScope,
  Task,
  Venture,
  VentureGraphEdge,
  VentureType,
  VentureWorkspace,
  Workflow,
  WorkspaceOutputManifestEntry,
} from "@exotic/types";
import { ventureWorkspaceContract } from "@exotic/contracts";
import {
  studioExecutionDependencies,
  studioKinds,
  ventureWorkspaceSchemaVersion,
} from "@exotic/types";

export const identity = {
  name: "@exotic/entity",
  tagline: "Everything Is Exotic.",
};

export interface VentureWorkspaceGenerationInput {
  request: string;
  operator: string;
  ventureName?: string;
  ventureType?: VentureType;
  ventureId?: string;
  now?: string;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "venture"
  );
}

function titleCaseFromRequest(request: string): string {
  const cleaned = request.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New Venture";
  return cleaned.length > 72
    ? `${cleaned.slice(0, 69).trim()}...`
    : cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isoNow(now?: string): string {
  return now || new Date().toISOString();
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

function scopedId(ventureId: string, kind: string, name: string): string {
  return `${ventureId}-${kind}-${slugify(name).toUpperCase()}`;
}

function objectiveFor(
  ventureId: string,
  now: string,
  owner: string,
  title: string,
  summary: string,
  priority: Objective["priority"],
): Objective {
  return {
    objectiveId: scopedId(ventureId, "OBJ", title),
    ventureId,
    title,
    summary,
    owner,
    priority,
    status: "active",
    successCriteria: [
      "Required workspace artifacts exist.",
      "Evidence is attached to completion claims.",
      "Downstream studios can execute without ambiguity.",
    ],
    dueContext: "Current build cycle",
    createdAt: now,
    updatedAt: now,
  };
}

function studioArtifactType(studio: StudioKind): Artifact["artifactType"] {
  const map: Record<StudioKind, Artifact["artifactType"]> = {
    ideas: "strategy-brief",
    business: "operating-plan",
    product: "product-requirements",
    design: "design-file",
    website: "website-page",
    development: "code-change",
    marketing: "marketing-asset",
    research: "research-brief",
    workflows: "workflow-definition",
    operations: "analytics-report",
  };
  return map[studio];
}

function studioPrompt(studio: StudioKind, request: string): string {
  const prompts: Record<StudioKind, string> = {
    ideas: `Frame the opportunity behind "${request}" and define why it deserves execution.`,
    business:
      "Define the business case, operating model, assumptions, and approval logic.",
    product:
      "Translate goals into requirements, milestones, and release sequencing.",
    design:
      "Define brand direction, interface rules, and visual system outputs.",
    website: "Create the public-facing site structure and publishing surface.",
    development:
      "Implement the underlying product and supporting code changes.",
    marketing: "Define positioning, messaging, channels, and launch campaigns.",
    research:
      "Collect sources, synthesize evidence, and support decisions with proof.",
    workflows:
      "Define execution flows, automations, checkpoints, and handoffs.",
    operations: "Track metrics, runtime state, approvals, and venture health.",
  };
  return prompts[studio];
}

export function createVentureWorkspace(
  input: VentureWorkspaceGenerationInput,
): VentureWorkspace {
  const now = isoNow(input.now);
  const ventureName = input.ventureName || titleCaseFromRequest(input.request);
  const operator = input.operator.trim() || "operator";
  const requestedVentureId = input.ventureId?.trim();
  const ventureId =
    requestedVentureId ||
    `V-${slugify(ventureName).toUpperCase()}-${shortHash(`${input.request}|${operator}|${now}`)}`;
  const venture: Venture = {
    ventureId,
    name: ventureName,
    type: input.ventureType || "business",
    status: "active",
    thesis: input.request.trim() || "New EXOTIC venture request",
    operator,
    createdAt: now,
    updatedAt: now,
  };

  const primaryObjective = objectiveFor(
    ventureId,
    now,
    operator,
    "Launch a connected venture workspace",
    "Turn the initial request into an executable workspace across all studios.",
    "critical",
  );
  const executionObjective = objectiveFor(
    ventureId,
    now,
    operator,
    "Produce real editable outputs",
    "Ensure EXOTIC creates artifacts, workflows, approvals, evidence, and measurable progress.",
    "high",
  );
  const objectives = [primaryObjective, executionObjective];

  const studioScopes: StudioScope[] = studioKinds.map((studio) => ({
    studioScopeId: scopedId(ventureId, "STUDIO", studio),
    ventureId,
    studio,
    objectiveIds: objectives.map((item) => item.objectiveId),
    status: "active",
    owner:
      studio === "development" ||
      studio === "workflows" ||
      studio === "operations"
        ? "codex"
        : operator,
    createdAt: now,
    updatedAt: now,
  }));

  const workflows: Workflow[] = [
    {
      workflowId: scopedId(ventureId, "WF", "foundation"),
      ventureId,
      objectiveIds: objectives.map((item) => item.objectiveId),
      title: "Foundation workspace generation",
      status: "active",
      owner: "codex",
      inputs: [
        "Initial operator request",
        "Venture model contracts",
        "Studio structure",
      ],
      outputs: [
        "Structured venture workspace",
        "Initial artifacts",
        "Execution roadmap",
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tasks: Task[] = studioKinds.map((studio) => ({
    taskId: scopedId(ventureId, "TASK", studio),
    workflowId: workflows[0].workflowId,
    ventureId,
    title: `${studio} studio initialization`,
    status:
      studio === "ideas" || studio === "business" || studio === "product"
        ? "active"
        : "proposed",
    owner:
      studio === "development" ||
      studio === "workflows" ||
      studio === "operations"
        ? "codex"
        : operator,
    actionType: "workspace-initialization",
    completionCriteria: [
      "Studio scope exists.",
      "Initial artifact is created.",
      "Dependencies and evidence expectations are visible.",
    ],
    createdAt: now,
    updatedAt: now,
  }));

  const artifacts: Artifact[] = studioKinds.map((studio) => ({
    artifactId: scopedId(ventureId, "ART", studio),
    ventureId,
    objectiveIds: objectives.map((item) => item.objectiveId),
    artifactType: studioArtifactType(studio),
    title: `${titleCaseFromRequest(studio)} studio artifact`,
    status: studio === "ideas" ? "active" : "proposed",
    location: `.exotic/workspaces/${slugify(ventureName)}/${studio}`,
    owner:
      studio === "development" ||
      studio === "workflows" ||
      studio === "operations"
        ? "codex"
        : operator,
    version: "0.1.0",
    createdAt: now,
    updatedAt: now,
  }));

  const evidenceRecords: EvidenceRecord[] = [
    {
      evidenceId: scopedId(ventureId, "EVID", "seed-request"),
      ventureId,
      relatedEntityType: "venture",
      relatedEntityId: ventureId,
      evidenceType: "artifact-version",
      source: input.request,
      capturedAt: now,
      verdict: "verified",
    },
  ];

  const decisions: Decision[] = [
    {
      decisionId: scopedId(ventureId, "DEC", "foundation"),
      ventureId,
      title: "Approve initial venture workspace structure",
      scope:
        "Establishes the first shared venture, studio, workflow, and artifact scaffold.",
      status: "active",
      decisionOwner: operator,
      approvalRequired: true,
      evidenceIds: evidenceRecords.map((item) => item.evidenceId),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const approvals: Approval[] = [
    {
      approvalId: scopedId(ventureId, "APR", "foundation"),
      ventureId,
      decisionId: decisions[0].decisionId,
      requestedBy: "codex",
      requiredByRole: "operator",
      status: "proposed",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const resources: Resource[] = [
    {
      resourceId: scopedId(ventureId, "RES", "build-capacity"),
      ventureId,
      resourceType: "labor-capacity",
      owner: "codex",
      limit: "Focused build cycles",
      usageState: "Planning and initial implementation",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const metrics: Metric[] = [
    {
      metricId: scopedId(ventureId, "MET", "workspace-coverage"),
      ventureId,
      name: "Workspace coverage",
      definition:
        "Percentage of required studio scopes and artifacts initialized.",
      currentValue: 100,
      targetValue: 100,
      updatedAt: now,
    },
    {
      metricId: scopedId(ventureId, "MET", "evidence-coverage"),
      ventureId,
      name: "Evidence coverage",
      definition:
        "Percentage of completed lifecycle entities backed by verified evidence.",
      currentValue: 100,
      targetValue: 100,
      updatedAt: now,
    },
  ];

  const memoryRecords: MemoryRecord[] = [
    {
      memoryId: scopedId(ventureId, "MEM", "request-origin"),
      ventureId,
      kind: "origin",
      summary: input.request,
      source: "operator-request",
      createdAt: now,
      relevanceTags: ["origin", "venture", "initial-request"],
    },
  ];

  const scopeByStudio = new Map(
    studioKinds.map((studio, index) => [studio, studioScopes[index]]),
  );
  const artifactByStudio = new Map(
    studioKinds.map((studio, index) => [studio, artifacts[index]]),
  );
  const taskByStudio = new Map(
    studioKinds.map((studio, index) => [studio, tasks[index]]),
  );
  const graphEdges: VentureGraphEdge[] = [];
  const addEdge = (
    fromEntityType: VentureGraphEdge["fromEntityType"],
    fromEntityId: string,
    relation: VentureGraphEdge["relation"],
    toEntityType: VentureGraphEdge["toEntityType"],
    toEntityId: string,
  ): void => {
    graphEdges.push({
      edgeId: scopedId(ventureId, "EDGE", String(graphEdges.length + 1)),
      ventureId,
      fromEntityType,
      fromEntityId,
      relation,
      toEntityType,
      toEntityId,
      createdAt: now,
    });
  };

  objectives.forEach((objective) =>
    addEdge(
      "venture",
      ventureId,
      "contains",
      "objective",
      objective.objectiveId,
    ),
  );
  studioScopes.forEach((scope) => {
    addEdge(
      "venture",
      ventureId,
      "scopes",
      "studio-scope",
      scope.studioScopeId,
    );
    scope.objectiveIds.forEach((objectiveId) =>
      addEdge(
        "studio-scope",
        scope.studioScopeId,
        "supports",
        "objective",
        objectiveId,
      ),
    );
  });
  tasks.forEach((task) =>
    addEdge("workflow", task.workflowId, "contains", "task", task.taskId),
  );
  studioKinds.forEach((studio) => {
    const scope = scopeByStudio.get(studio)!;
    const task = taskByStudio.get(studio)!;
    const artifact = artifactByStudio.get(studio)!;
    addEdge(
      "task",
      task.taskId,
      "implements",
      "studio-scope",
      scope.studioScopeId,
    );
    addEdge("task", task.taskId, "produces", "artifact", artifact.artifactId);
    studioExecutionDependencies[studio].forEach((dependencyStudio) =>
      addEdge(
        "task",
        task.taskId,
        "depends-on",
        "task",
        taskByStudio.get(dependencyStudio)!.taskId,
      ),
    );
  });
  artifacts.forEach((artifact) => {
    artifact.objectiveIds.forEach((objectiveId) =>
      addEdge(
        "artifact",
        artifact.artifactId,
        "supports",
        "objective",
        objectiveId,
      ),
    );
  });
  evidenceRecords.forEach((evidence) =>
    addEdge(
      "evidence-record",
      evidence.evidenceId,
      "verifies",
      evidence.relatedEntityType,
      evidence.relatedEntityId,
    ),
  );
  decisions.forEach((decision) => {
    decision.evidenceIds.forEach((evidenceId) =>
      addEdge(
        "decision",
        decision.decisionId,
        "depends-on",
        "evidence-record",
        evidenceId,
      ),
    );
  });
  approvals.forEach((approval) => {
    if (approval.decisionId)
      addEdge(
        "approval",
        approval.approvalId,
        "governs",
        "decision",
        approval.decisionId,
      );
    if (approval.artifactId)
      addEdge(
        "approval",
        approval.approvalId,
        "governs",
        "artifact",
        approval.artifactId,
      );
  });
  resources.forEach((resource) =>
    addEdge("venture", ventureId, "contains", "resource", resource.resourceId),
  );
  metrics.forEach((metric) =>
    addEdge("metric", metric.metricId, "measures", "venture", ventureId),
  );
  memoryRecords.forEach((memory) =>
    addEdge(
      "memory-record",
      memory.memoryId,
      "remembers",
      "venture",
      ventureId,
    ),
  );

  const entityIds = (...ids: Array<string | undefined>): string[] =>
    ids.filter((id): id is string => Boolean(id));
  const outputManifest: WorkspaceOutputManifestEntry[] = [
    { output: "venture-record", entityIds: [ventureId] },
    {
      output: "objective-hierarchy",
      entityIds: objectives.map((objective) => objective.objectiveId),
    },
    {
      output: "studio-scopes",
      entityIds: studioScopes.map((scope) => scope.studioScopeId),
    },
    {
      output: "initial-workflows",
      entityIds: workflows.map((workflow) => workflow.workflowId),
    },
    {
      output: "business-strategy-artifact",
      entityIds: entityIds(artifactByStudio.get("business")?.artifactId),
    },
    {
      output: "product-requirements-artifact",
      entityIds: entityIds(artifactByStudio.get("product")?.artifactId),
    },
    {
      output: "brand-or-design-seed-artifact",
      entityIds: entityIds(artifactByStudio.get("design")?.artifactId),
    },
    {
      output: "implementation-workstream",
      entityIds: entityIds(
        taskByStudio.get("development")?.taskId,
        artifactByStudio.get("development")?.artifactId,
      ),
    },
    {
      output: "website-workstream",
      entityIds: entityIds(
        taskByStudio.get("website")?.taskId,
        artifactByStudio.get("website")?.artifactId,
      ),
    },
    {
      output: "marketing-workstream",
      entityIds: entityIds(
        taskByStudio.get("marketing")?.taskId,
        artifactByStudio.get("marketing")?.artifactId,
      ),
    },
    {
      output: "approvals-queue",
      entityIds: approvals.map((approval) => approval.approvalId),
    },
    {
      output: "metrics-scaffold",
      entityIds: metrics.map((metric) => metric.metricId),
    },
    {
      output: "evidence-scaffold",
      entityIds: evidenceRecords.map((evidence) => evidence.evidenceId),
    },
  ];

  const workspace: VentureWorkspace = {
    schemaVersion: ventureWorkspaceSchemaVersion,
    generatedAt: now,
    venture,
    objectives,
    studioScopes,
    workflows,
    tasks,
    artifacts,
    evidenceRecords,
    decisions,
    approvals,
    resources,
    metrics,
    memoryRecords,
    graphEdges,
    outputManifest,
  };
  return ventureWorkspaceContract.parse(workspace);
}

export function summarizeWorkspace(workspace: VentureWorkspace): string {
  return [
    `${workspace.venture.name} (${workspace.venture.type})`,
    `${workspace.objectives.length} objectives`,
    `${workspace.studioScopes.length} studio scopes`,
    `${workspace.workflows.length} workflows`,
    `${workspace.artifacts.length} artifacts`,
    `${workspace.evidenceRecords.length} evidence records`,
  ].join(" | ");
}
