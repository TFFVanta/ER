import {
  artifactTypes,
  entityTypes,
  evidenceTypes,
  evidenceVerdicts,
  graphRelationTypes,
  priorities,
  requiredGeneratedWorkspaceArtifacts,
  resourceTypes,
  studioKinds,
  ventureStatuses,
  ventureTypes,
  ventureWorkspaceSchemaVersion,
} from "@exotic/types";
import type {
  EntityType,
  RequiredGeneratedWorkspaceArtifact,
  VentureWorkspace,
} from "@exotic/types";

export type ExoticContract<TInput = unknown, TOutput = TInput> = {
  name: string;
  version: string;
  parse(input: TInput): TOutput;
};

export function defineContract<TInput, TOutput>(
  contract: ExoticContract<TInput, TOutput>,
): ExoticContract<TInput, TOutput> {
  return contract;
}

export const identity = {
  name: "@exotic/contracts",
  tagline: "Everything Is Exotic.",
};

export const ventureEntityContracts = {
  venture: [
    "ventureId",
    "name",
    "type",
    "status",
    "thesis",
    "operator",
    "createdAt",
    "updatedAt",
  ],
  objective: [
    "objectiveId",
    "ventureId",
    "title",
    "summary",
    "owner",
    "priority",
    "status",
    "successCriteria",
    "dueContext",
    "createdAt",
    "updatedAt",
  ],
  studioScope: [
    "studioScopeId",
    "ventureId",
    "studio",
    "objectiveIds",
    "status",
    "owner",
    "createdAt",
    "updatedAt",
  ],
  workflow: [
    "workflowId",
    "ventureId",
    "objectiveIds",
    "title",
    "status",
    "owner",
    "inputs",
    "outputs",
    "createdAt",
    "updatedAt",
  ],
  task: [
    "taskId",
    "workflowId",
    "ventureId",
    "title",
    "status",
    "owner",
    "actionType",
    "completionCriteria",
    "createdAt",
    "updatedAt",
  ],
  artifact: [
    "artifactId",
    "ventureId",
    "objectiveIds",
    "artifactType",
    "title",
    "status",
    "location",
    "owner",
    "version",
    "createdAt",
    "updatedAt",
  ],
  evidenceRecord: [
    "evidenceId",
    "ventureId",
    "relatedEntityType",
    "relatedEntityId",
    "evidenceType",
    "source",
    "capturedAt",
    "verdict",
  ],
  decision: [
    "decisionId",
    "ventureId",
    "title",
    "scope",
    "status",
    "decisionOwner",
    "approvalRequired",
    "evidenceIds",
    "createdAt",
    "updatedAt",
  ],
  approval: [
    "approvalId",
    "ventureId",
    "requestedBy",
    "requiredByRole",
    "status",
    "createdAt",
    "updatedAt",
  ],
  resource: [
    "resourceId",
    "ventureId",
    "resourceType",
    "owner",
    "limit",
    "usageState",
    "status",
    "createdAt",
    "updatedAt",
  ],
  metric: [
    "metricId",
    "ventureId",
    "name",
    "definition",
    "currentValue",
    "targetValue",
    "updatedAt",
  ],
  memoryRecord: [
    "memoryId",
    "ventureId",
    "kind",
    "summary",
    "source",
    "createdAt",
    "relevanceTags",
  ],
  graphEdge: [
    "edgeId",
    "ventureId",
    "fromEntityType",
    "fromEntityId",
    "relation",
    "toEntityType",
    "toEntityId",
    "createdAt",
  ],
} as const;

export type VentureEntityContractName = keyof typeof ventureEntityContracts;

export function requiredFieldsFor(
  name: VentureEntityContractName,
): readonly string[] {
  return ventureEntityContracts[name];
}

export function findMissingRequiredFields(
  name: VentureEntityContractName,
  candidate: Record<string, unknown>,
): string[] {
  return ventureEntityContracts[name].filter(
    (field) => candidate[field] === undefined,
  );
}

export function assertRequiredFields(
  name: VentureEntityContractName,
  candidate: Record<string, unknown>,
): Record<string, unknown> {
  const missing = findMissingRequiredFields(name, candidate);
  if (missing.length) {
    throw new Error(
      `Contract ${name} is missing required fields: ${missing.join(", ")}`,
    );
  }
  return candidate;
}

type EntityContractName = Exclude<VentureEntityContractName, "graphEdge">;

type WorkspaceCollection = {
  field: keyof VentureWorkspace;
  contract: EntityContractName;
  idField: string;
  entityType: EntityType;
  lifecycle: boolean;
};

const workspaceCollections: readonly WorkspaceCollection[] = [
  {
    field: "objectives",
    contract: "objective",
    idField: "objectiveId",
    entityType: "objective",
    lifecycle: true,
  },
  {
    field: "studioScopes",
    contract: "studioScope",
    idField: "studioScopeId",
    entityType: "studio-scope",
    lifecycle: true,
  },
  {
    field: "workflows",
    contract: "workflow",
    idField: "workflowId",
    entityType: "workflow",
    lifecycle: true,
  },
  {
    field: "tasks",
    contract: "task",
    idField: "taskId",
    entityType: "task",
    lifecycle: true,
  },
  {
    field: "artifacts",
    contract: "artifact",
    idField: "artifactId",
    entityType: "artifact",
    lifecycle: true,
  },
  {
    field: "evidenceRecords",
    contract: "evidenceRecord",
    idField: "evidenceId",
    entityType: "evidence-record",
    lifecycle: false,
  },
  {
    field: "decisions",
    contract: "decision",
    idField: "decisionId",
    entityType: "decision",
    lifecycle: true,
  },
  {
    field: "approvals",
    contract: "approval",
    idField: "approvalId",
    entityType: "approval",
    lifecycle: true,
  },
  {
    field: "resources",
    contract: "resource",
    idField: "resourceId",
    entityType: "resource",
    lifecycle: true,
  },
  {
    field: "metrics",
    contract: "metric",
    idField: "metricId",
    entityType: "metric",
    lifecycle: false,
  },
  {
    field: "memoryRecords",
    contract: "memoryRecord",
    idField: "memoryId",
    entityType: "memory-record",
    lifecycle: false,
  },
];

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function expectRecordArray(
  value: unknown,
  label: string,
): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value.map((item, index) => expectRecord(item, `${label}[${index}]`));
}

function expectIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty identifier.`);
  }
  return value;
}

function expectIdentifierArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw new Error(`${label} must be an array of non-empty identifiers.`);
  }
  return value as string[];
}

function expectEnum(
  value: unknown,
  allowed: readonly string[],
  label: string,
): string {
  const normalized = expectIdentifier(value, label);
  if (!allowed.includes(normalized)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return normalized;
}

function assertCanonicalValues(
  contract: EntityContractName,
  record: Record<string, unknown>,
  label: string,
): void {
  if (contract === "venture")
    expectEnum(record.type, ventureTypes, `${label}.type`);
  if (contract === "objective")
    expectEnum(record.priority, priorities, `${label}.priority`);
  if (contract === "studioScope")
    expectEnum(record.studio, studioKinds, `${label}.studio`);
  if (contract === "artifact")
    expectEnum(record.artifactType, artifactTypes, `${label}.artifactType`);
  if (contract === "evidenceRecord") {
    expectEnum(
      record.relatedEntityType,
      entityTypes,
      `${label}.relatedEntityType`,
    );
    expectEnum(record.evidenceType, evidenceTypes, `${label}.evidenceType`);
    expectEnum(record.verdict, evidenceVerdicts, `${label}.verdict`);
  }
  if (contract === "resource")
    expectEnum(record.resourceType, resourceTypes, `${label}.resourceType`);
  if (
    [
      "venture",
      "objective",
      "studioScope",
      "workflow",
      "task",
      "artifact",
      "decision",
      "approval",
      "resource",
    ].includes(contract)
  ) {
    expectEnum(record.status, ventureStatuses, `${label}.status`);
  }
}

function assertLifecycleState(
  record: Record<string, unknown>,
  label: string,
): void {
  if (record.status !== "blocked") return;
  const blocker = expectRecord(record.blocker, `${label}.blocker`);
  expectIdentifier(blocker.reason, `${label}.blocker.reason`);
  expectIdentifier(blocker.owner, `${label}.blocker.owner`);
  const criteria = expectIdentifierArray(
    blocker.resolutionCriteria,
    `${label}.blocker.resolutionCriteria`,
  );
  if (!criteria.length) {
    throw new Error(`${label}.blocker.resolutionCriteria must not be empty.`);
  }
  expectIdentifier(blocker.raisedAt, `${label}.blocker.raisedAt`);
}

export const ventureWorkspaceContract = defineContract<
  unknown,
  VentureWorkspace
>({
  name: "exotic.venture-workspace",
  version: "1.0.0",
  parse(input) {
    const candidate = expectRecord(input, "Workspace");
    const requiredTopLevel = [
      "schemaVersion",
      "generatedAt",
      "venture",
      "objectives",
      "studioScopes",
      "workflows",
      "tasks",
      "artifacts",
      "evidenceRecords",
      "decisions",
      "approvals",
      "resources",
      "metrics",
      "memoryRecords",
      "graphEdges",
      "outputManifest",
    ];
    const missing = requiredTopLevel.filter(
      (field) => candidate[field] === undefined,
    );
    if (missing.length) {
      throw new Error(
        `Workspace contract is missing top-level fields: ${missing.join(", ")}`,
      );
    }
    if (candidate.schemaVersion !== ventureWorkspaceSchemaVersion) {
      throw new Error(
        `Workspace schemaVersion must be ${ventureWorkspaceSchemaVersion}.`,
      );
    }
    expectIdentifier(candidate.generatedAt, "Workspace.generatedAt");

    const venture = assertRequiredFields(
      "venture",
      expectRecord(candidate.venture, "Workspace.venture"),
    );
    assertCanonicalValues("venture", venture, "Workspace.venture");
    const ventureId = expectIdentifier(
      venture.ventureId,
      "Workspace.venture.ventureId",
    );
    const usedIds = new Set<string>();
    const entityIndex = new Map<
      string,
      { type: EntityType; record: Record<string, unknown> }
    >();
    const lifecycleEntities: Array<{
      type: EntityType;
      id: string;
      record: Record<string, unknown>;
      label: string;
    }> = [];
    const recordsByField = new Map<string, Record<string, unknown>[]>();

    const registerEntity = (
      type: EntityType,
      id: string,
      record: Record<string, unknown>,
      label: string,
    ): void => {
      if (usedIds.has(id)) {
        throw new Error(
          `Workspace entity identifiers must be globally unique; duplicate ${id} at ${label}.`,
        );
      }
      usedIds.add(id);
      entityIndex.set(id, { type, record });
    };

    registerEntity("venture", ventureId, venture, "Workspace.venture");
    lifecycleEntities.push({
      type: "venture",
      id: ventureId,
      record: venture,
      label: "Workspace.venture",
    });

    for (const collection of workspaceCollections) {
      const records = expectRecordArray(
        candidate[collection.field],
        `Workspace.${collection.field}`,
      );
      recordsByField.set(collection.field, records);
      records.forEach((record, index) => {
        const label = `Workspace.${collection.field}[${index}]`;
        assertRequiredFields(collection.contract, record);
        assertCanonicalValues(collection.contract, record, label);
        const id = expectIdentifier(
          record[collection.idField],
          `${label}.${collection.idField}`,
        );
        if (record.ventureId !== ventureId) {
          throw new Error(`${label}.ventureId must match ${ventureId}.`);
        }
        registerEntity(collection.entityType, id, record, label);
        if (collection.lifecycle)
          lifecycleEntities.push({
            type: collection.entityType,
            id,
            record,
            label,
          });
      });
    }

    const recordsFor = (field: string): Record<string, unknown>[] =>
      recordsByField.get(field) || [];
    const assertReference = (
      expectedType: EntityType,
      id: string,
      label: string,
    ): void => {
      const target = entityIndex.get(id);
      if (!target) throw new Error(`${label} references missing entity ${id}.`);
      if (target.type !== expectedType) {
        throw new Error(
          `${label} expected ${expectedType} ${id}, found ${target.type}.`,
        );
      }
    };
    const assertReferences = (
      value: unknown,
      expectedType: EntityType,
      label: string,
    ): void => {
      expectIdentifierArray(value, label).forEach((id) =>
        assertReference(expectedType, id, label),
      );
    };

    for (const field of ["studioScopes", "workflows", "artifacts"]) {
      recordsFor(field).forEach((record, index) => {
        assertReferences(
          record.objectiveIds,
          "objective",
          `Workspace.${field}[${index}].objectiveIds`,
        );
      });
    }
    recordsFor("tasks").forEach((record, index) => {
      const workflowId = expectIdentifier(
        record.workflowId,
        `Workspace.tasks[${index}].workflowId`,
      );
      assertReference(
        "workflow",
        workflowId,
        `Workspace.tasks[${index}].workflowId`,
      );
    });

    const verifiedEvidenceTargets = new Set<string>();
    recordsFor("evidenceRecords").forEach((record, index) => {
      const relatedType = expectIdentifier(
        record.relatedEntityType,
        `Workspace.evidenceRecords[${index}].relatedEntityType`,
      ) as EntityType;
      const relatedId = expectIdentifier(
        record.relatedEntityId,
        `Workspace.evidenceRecords[${index}].relatedEntityId`,
      );
      assertReference(
        relatedType,
        relatedId,
        `Workspace.evidenceRecords[${index}]`,
      );
      if (record.verdict === "verified")
        verifiedEvidenceTargets.add(`${relatedType}:${relatedId}`);
    });
    recordsFor("decisions").forEach((record, index) => {
      assertReferences(
        record.evidenceIds,
        "evidence-record",
        `Workspace.decisions[${index}].evidenceIds`,
      );
    });
    recordsFor("approvals").forEach((record, index) => {
      const targets = [record.decisionId, record.artifactId].filter(
        (value) => value !== undefined,
      );
      if (targets.length !== 1) {
        throw new Error(
          `Workspace.approvals[${index}] must reference exactly one decisionId or artifactId.`,
        );
      }
      if (record.decisionId !== undefined) {
        assertReference(
          "decision",
          expectIdentifier(
            record.decisionId,
            `Workspace.approvals[${index}].decisionId`,
          ),
          `Workspace.approvals[${index}].decisionId`,
        );
      }
      if (record.artifactId !== undefined) {
        assertReference(
          "artifact",
          expectIdentifier(
            record.artifactId,
            `Workspace.approvals[${index}].artifactId`,
          ),
          `Workspace.approvals[${index}].artifactId`,
        );
      }
    });

    lifecycleEntities.forEach((entity) => {
      assertLifecycleState(entity.record, entity.label);
      if (entity.record.status !== "completed") return;
      if (!verifiedEvidenceTargets.has(`${entity.type}:${entity.id}`)) {
        throw new Error(
          `${entity.label} cannot be completed without verified evidence.`,
        );
      }
      if (
        entity.type === "approval" &&
        entity.record.approvedAt === undefined
      ) {
        throw new Error(
          `${entity.label} cannot be completed without approvedAt.`,
        );
      }
    });

    const graphEdges = expectRecordArray(
      candidate.graphEdges,
      "Workspace.graphEdges",
    );
    graphEdges.forEach((edge, index) => {
      const label = `Workspace.graphEdges[${index}]`;
      assertRequiredFields("graphEdge", edge);
      const edgeId = expectIdentifier(edge.edgeId, `${label}.edgeId`);
      if (usedIds.has(edgeId))
        throw new Error(
          `Workspace identifiers must be globally unique; duplicate ${edgeId}.`,
        );
      usedIds.add(edgeId);
      if (edge.ventureId !== ventureId)
        throw new Error(`${label}.ventureId must match ${ventureId}.`);
      const fromType = expectIdentifier(
        edge.fromEntityType,
        `${label}.fromEntityType`,
      ) as EntityType;
      const toType = expectIdentifier(
        edge.toEntityType,
        `${label}.toEntityType`,
      ) as EntityType;
      expectEnum(fromType, entityTypes, `${label}.fromEntityType`);
      expectEnum(toType, entityTypes, `${label}.toEntityType`);
      expectEnum(edge.relation, graphRelationTypes, `${label}.relation`);
      assertReference(
        fromType,
        expectIdentifier(edge.fromEntityId, `${label}.fromEntityId`),
        `${label}.fromEntityId`,
      );
      assertReference(
        toType,
        expectIdentifier(edge.toEntityId, `${label}.toEntityId`),
        `${label}.toEntityId`,
      );
    });

    const outputManifest = expectRecordArray(
      candidate.outputManifest,
      "Workspace.outputManifest",
    );
    const requiredOutputs = new Set<RequiredGeneratedWorkspaceArtifact>(
      requiredGeneratedWorkspaceArtifacts,
    );
    const observedOutputs = new Set<RequiredGeneratedWorkspaceArtifact>();
    outputManifest.forEach((entry, index) => {
      const label = `Workspace.outputManifest[${index}]`;
      const output = expectIdentifier(
        entry.output,
        `${label}.output`,
      ) as RequiredGeneratedWorkspaceArtifact;
      if (!requiredOutputs.has(output))
        throw new Error(
          `${label}.output is not a canonical generated output: ${output}.`,
        );
      if (observedOutputs.has(output))
        throw new Error(`${label}.output duplicates ${output}.`);
      observedOutputs.add(output);
      const entityIds = expectIdentifierArray(
        entry.entityIds,
        `${label}.entityIds`,
      );
      if (!entityIds.length)
        throw new Error(`${label}.entityIds must not be empty.`);
      entityIds.forEach((id) => {
        if (!entityIndex.has(id))
          throw new Error(
            `${label}.entityIds references missing entity ${id}.`,
          );
      });
    });
    const missingOutputs = [...requiredOutputs].filter(
      (output) => !observedOutputs.has(output),
    );
    if (missingOutputs.length) {
      throw new Error(
        `Workspace output manifest is missing required outputs: ${missingOutputs.join(", ")}`,
      );
    }

    return candidate as unknown as VentureWorkspace;
  },
});
