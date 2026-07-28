import crypto from "node:crypto";
import type { RelationshipType } from "./types";
import type { UniversalObject } from "./object";
import type { LiveMetadata } from "./metadata";

export type MemoryRelationship = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  strength: number;
  createdAt: string;
};

export class UniversalMemoryGraph {
  objects = new Map<string, UniversalObject>();
  metadata = new Map<string, LiveMetadata>();
  relationships = new Map<string, MemoryRelationship>();

  addObject(object: UniversalObject, metadata: LiveMetadata): void {
    this.objects.set(object.id, object);
    this.metadata.set(object.id, metadata);
  }

  getObject(id: string): UniversalObject | undefined {
    return this.objects.get(id);
  }

  getMetadata(id: string): LiveMetadata | undefined {
    return this.metadata.get(id);
  }

  updateMetadata(id: string, patch: Partial<LiveMetadata>): LiveMetadata {
    const current = this.metadata.get(id);
    if (!current) throw new Error(`metadata not found for ${id}`);
    const next = { ...current, ...patch, timestamps: { ...current.timestamps, updatedAt: new Date().toISOString() } };
    this.metadata.set(id, next);
    return next;
  }

  link(fromId: string, toId: string, type: RelationshipType, strength = 1): MemoryRelationship {
    if (!this.objects.has(fromId)) throw new Error(`from object not found: ${fromId}`);
    if (!this.objects.has(toId)) throw new Error(`to object not found: ${toId}`);

    const relationship: MemoryRelationship = {
      id: crypto.randomUUID(),
      fromId,
      toId,
      type,
      strength,
      createdAt: new Date().toISOString()
    };

    this.relationships.set(relationship.id, relationship);
    return relationship;
  }

  relatedTo(objectId: string): MemoryRelationship[] {
    return [...this.relationships.values()].filter((rel) => rel.fromId === objectId || rel.toId === objectId);
  }

  searchByName(query: string): UniversalObject[] {
    const q = query.toLowerCase();
    return [...this.objects.values()].filter((object) => object.name.toLowerCase().includes(q));
  }
}
