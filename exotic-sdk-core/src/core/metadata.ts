import crypto from "node:crypto";
import type { AccessLevel, MemoryLayer, RetentionPolicy } from "./types.js";
import type { UniversalObject } from "./object.js";
import type { UniversalState } from "./state.js";

export type LiveMetadata = {
  id: string;
  objectId: string;
  address: string;
  type: string;
  subtype?: string;
  status: string;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    observedAt: string;
    lastAccessedAt?: string;
    expiresAt?: string;
  };
  state: {
    health: number;
    confidence: number;
    alignment: number;
    freshness: number;
    relevance: number;
    trust: number;
  };
  location: {
    layer: MemoryLayer;
    path?: string;
    graphNodeId?: string;
    storageRef?: string;
  };
  protection: {
    accessLevel: AccessLevel;
    encryptionRequired: boolean;
    auditRequired: boolean;
    retentionPolicy: RetentionPolicy;
  };
  relationships: {
    parentIds: string[];
    childIds: string[];
    relatedIds: string[];
    dependencyIds: string[];
  };
  indexes: {
    keyword: boolean;
    semantic: boolean;
    temporal: boolean;
    graph: boolean;
    permission: boolean;
    alignment: boolean;
  };
  movement: {
    movable: boolean;
    currentLayer: MemoryLayer;
    recommendedLayer?: MemoryLayer;
    movementReason?: string;
  };
  version: {
    current: string;
    previous?: string;
    hash: string;
    checksum: string;
  };
};

export function createLiveMetadata(object: UniversalObject, state: UniversalState, layer: MemoryLayer = "working"): LiveMetadata {
  const now = new Date().toISOString();
  const hash = hashObject({ object, state, now });

  return {
    id: crypto.randomUUID(),
    objectId: object.id,
    address: object.address,
    type: object.type,
    subtype: object.subtype,
    status: object.status,
    timestamps: {
      createdAt: object.createdAt,
      updatedAt: now,
      observedAt: state.observedAt
    },
    state: {
      health: state.health,
      confidence: state.confidence,
      alignment: state.alignment,
      freshness: state.freshness,
      relevance: state.relevance,
      trust: state.trust
    },
    location: { layer },
    protection: {
      accessLevel: object.type === "system" ? "restricted" : "private",
      encryptionRequired: object.type === "system",
      auditRequired: true,
      retentionPolicy: "keep"
    },
    relationships: {
      parentIds: [],
      childIds: [],
      relatedIds: [],
      dependencyIds: []
    },
    indexes: {
      keyword: false,
      semantic: false,
      temporal: false,
      graph: false,
      permission: false,
      alignment: false
    },
    movement: {
      movable: true,
      currentLayer: layer
    },
    version: {
      current: object.version,
      hash,
      checksum: hash.slice(0, 16)
    }
  };
}

export function hashObject(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
