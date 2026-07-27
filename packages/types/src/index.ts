export const identity = {
  name: "@exotic/types",
  tagline: "Everything Is Exotic.",
};

export const ventureStatuses = [
  "proposed",
  "active",
  "blocked",
  "paused",
  "completed",
  "archived",
] as const;
export type VentureStatus = (typeof ventureStatuses)[number];

export const ventureTypes = [
  "business",
  "software-product",
  "website",
  "brand",
  "creative-project",
  "research-program",
  "automated-system",
] as const;
export type VentureType = (typeof ventureTypes)[number];

export const studioKinds = [
  "ideas",
  "business",
  "product",
  "design",
  "website",
  "development",
  "marketing",
  "research",
  "workflows",
  "operations",
] as const;
export type StudioKind = (typeof studioKinds)[number];

export const studioExecutionDependencies: Readonly<
  Record<StudioKind, readonly StudioKind[]>
> = {
  ideas: [],
  research: [],
  business: ["ideas", "research"],
  product: ["business"],
  design: ["product"],
  development: ["product"],
  marketing: ["business", "product"],
  workflows: ["product"],
  website: ["design", "development", "marketing"],
  operations: ["website", "workflows"],
};

export const priorities = ["critical", "high", "normal", "low"] as const;
export type Priority = (typeof priorities)[number];

export const artifactTypes = [
  "strategy-brief",
  "brand-asset",
  "product-requirements",
  "design-file",
  "code-change",
  "website-page",
  "workflow-definition",
  "operating-plan",
  "analytics-report",
  "research-brief",
  "marketing-asset",
] as const;
export type ArtifactType = (typeof artifactTypes)[number];

export const evidenceTypes = [
  "test-result",
  "research-citation",
  "metric-snapshot",
  "approval-record",
  "audit-event",
  "screenshot",
  "runtime-log",
  "artifact-version",
] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

export const evidenceVerdicts = [
  "pending",
  "verified",
  "rejected",
  "informational",
] as const;
export type EvidenceVerdict = (typeof evidenceVerdicts)[number];

export const resourceTypes = [
  "budget",
  "api-usage",
  "infrastructure",
  "labor-capacity",
  "model-runtime",
] as const;
export type ResourceType = (typeof resourceTypes)[number];

export const entityTypes = [
  "venture",
  "objective",
  "studio-scope",
  "workflow",
  "task",
  "artifact",
  "evidence-record",
  "decision",
  "approval",
  "resource",
  "metric",
  "memory-record",
] as const;
export type EntityType = (typeof entityTypes)[number];

export const graphRelationTypes = [
  "contains",
  "scopes",
  "supports",
  "implements",
  "depends-on",
  "produces",
  "verifies",
  "governs",
  "measures",
  "remembers",
] as const;
export type GraphRelationType = (typeof graphRelationTypes)[number];

export const ventureWorkspaceSchemaVersion = "1.0.0" as const;

export type Timestamp = string;
export type Identifier = string;

export interface LifecycleBlocker {
  reason: string;
  owner: string;
  resolutionCriteria: string[];
  raisedAt: Timestamp;
}

export interface BaseEntity {
  id: Identifier;
  ventureId: Identifier;
  status: VentureStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Venture {
  ventureId: Identifier;
  name: string;
  type: VentureType;
  status: VentureStatus;
  thesis: string;
  operator: string;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Objective {
  objectiveId: Identifier;
  ventureId: Identifier;
  title: string;
  summary: string;
  owner: string;
  priority: Priority;
  status: VentureStatus;
  successCriteria: string[];
  dueContext: string;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudioScope {
  studioScopeId: Identifier;
  ventureId: Identifier;
  studio: StudioKind;
  objectiveIds: Identifier[];
  status: VentureStatus;
  owner: string;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Workflow {
  workflowId: Identifier;
  ventureId: Identifier;
  objectiveIds: Identifier[];
  title: string;
  status: VentureStatus;
  owner: string;
  inputs: string[];
  outputs: string[];
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  taskId: Identifier;
  workflowId: Identifier;
  ventureId: Identifier;
  title: string;
  status: VentureStatus;
  owner: string;
  actionType: string;
  completionCriteria: string[];
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Artifact {
  artifactId: Identifier;
  ventureId: Identifier;
  objectiveIds: Identifier[];
  artifactType: ArtifactType;
  title: string;
  status: VentureStatus;
  location: string;
  owner: string;
  version: string;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EvidenceRecord {
  evidenceId: Identifier;
  ventureId: Identifier;
  relatedEntityType: EntityType;
  relatedEntityId: Identifier;
  evidenceType: EvidenceType;
  source: string;
  capturedAt: Timestamp;
  verdict: EvidenceVerdict;
}

export interface Decision {
  decisionId: Identifier;
  ventureId: Identifier;
  title: string;
  scope: string;
  status: VentureStatus;
  decisionOwner: string;
  approvalRequired: boolean;
  evidenceIds: Identifier[];
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Approval {
  approvalId: Identifier;
  ventureId: Identifier;
  decisionId?: Identifier;
  artifactId?: Identifier;
  requestedBy: string;
  requiredByRole: string;
  status: VentureStatus;
  approvedAt?: Timestamp;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Resource {
  resourceId: Identifier;
  ventureId: Identifier;
  resourceType: ResourceType;
  owner: string;
  limit: number | string;
  usageState: string;
  status: VentureStatus;
  blocker?: LifecycleBlocker;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Metric {
  metricId: Identifier;
  ventureId: Identifier;
  name: string;
  definition: string;
  currentValue: number | string;
  targetValue: number | string;
  updatedAt: Timestamp;
}

export interface MemoryRecord {
  memoryId: Identifier;
  ventureId: Identifier;
  kind: string;
  summary: string;
  source: string;
  createdAt: Timestamp;
  relevanceTags: string[];
}

export interface VentureGraphEdge {
  edgeId: Identifier;
  ventureId: Identifier;
  fromEntityType: EntityType;
  fromEntityId: Identifier;
  relation: GraphRelationType;
  toEntityType: EntityType;
  toEntityId: Identifier;
  createdAt: Timestamp;
}

export interface WorkspaceOutputManifestEntry {
  output: RequiredGeneratedWorkspaceArtifact;
  entityIds: Identifier[];
}

export interface VentureWorkspace {
  schemaVersion: typeof ventureWorkspaceSchemaVersion;
  generatedAt: Timestamp;
  venture: Venture;
  objectives: Objective[];
  studioScopes: StudioScope[];
  workflows: Workflow[];
  tasks: Task[];
  artifacts: Artifact[];
  evidenceRecords: EvidenceRecord[];
  decisions: Decision[];
  approvals: Approval[];
  resources: Resource[];
  metrics: Metric[];
  memoryRecords: MemoryRecord[];
  graphEdges: VentureGraphEdge[];
  outputManifest: WorkspaceOutputManifestEntry[];
}

export const requiredGeneratedWorkspaceArtifacts = [
  "venture-record",
  "objective-hierarchy",
  "studio-scopes",
  "initial-workflows",
  "business-strategy-artifact",
  "product-requirements-artifact",
  "brand-or-design-seed-artifact",
  "implementation-workstream",
  "website-workstream",
  "marketing-workstream",
  "approvals-queue",
  "metrics-scaffold",
  "evidence-scaffold",
] as const;

export type RequiredGeneratedWorkspaceArtifact =
  (typeof requiredGeneratedWorkspaceArtifacts)[number];
