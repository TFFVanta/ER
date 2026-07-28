export type ObjectType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "code"
  | "file"
  | "event"
  | "agent"
  | "project"
  | "memory"
  | "sensor"
  | "system";

export type ObjectStatus =
  | "new"
  | "active"
  | "changing"
  | "stale"
  | "archived"
  | "sealed"
  | "error";

export type MemoryLayer =
  | "buffer"
  | "active"
  | "working"
  | "project"
  | "knowledge"
  | "relationship"
  | "archive"
  | "backup"
  | "vault"
  | "ledger";

export type AccessLevel = "public" | "private" | "restricted" | "sealed";

export type RetentionPolicy = "keep" | "review" | "archive" | "expire";

export type RelationshipType =
  | "parent"
  | "child"
  | "owner"
  | "dependency"
  | "uses"
  | "creates"
  | "reads"
  | "writes"
  | "contains"
  | "references"
  | "inspires"
  | "conflicts"
  | "synchronizes"
  | "predicts"
  | "learns_from"
  | "observes"
  | "related";

export type MetadataEventType =
  | "metadata.created"
  | "metadata.updated"
  | "metadata.observed"
  | "metadata.linked"
  | "metadata.moved"
  | "metadata.sealed"
  | "metadata.archived"
  | "metadata.restored"
  | "metadata.indexed"
  | "metadata.conflict_detected"
  | "metadata.permission_changed"
  | "metadata.quality_changed"
  | "metadata.relationship_changed"
  | "metadata.prediction_changed"
  | "metadata.ready";

export type EngineName =
  | "observer"
  | "alignment"
  | "memory"
  | "prediction"
  | "execution"
  | "learning"
  | "relationship";
