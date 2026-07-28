import { EventBus } from "./event-bus";
import { createLiveMetadata, type LiveMetadata } from "./metadata";
import { createUniversalObject, type UniversalObject } from "./object";
import { createInitialState, type UniversalState } from "./state";
import { UniversalMemoryGraph } from "./memory-graph";
import { IndexManager } from "./index-manager";
import { ProtectionGate } from "./protection";
import type { MemoryLayer, ObjectType, RelationshipType } from "./types";

export class LiveMetadataFabric {
  readonly bus = new EventBus();
  readonly graph = new UniversalMemoryGraph();
  readonly indexes = new IndexManager();
  readonly protection = new ProtectionGate();

  async observe(input: {
    type: ObjectType;
    name: string;
    subtype?: string;
    owner?: string;
    layer?: MemoryLayer;
    goals?: string[];
  }): Promise<{ object: UniversalObject; state: UniversalState; metadata: LiveMetadata }> {
    const object = createUniversalObject(input);
    object.status = "active";

    const state = createInitialState(object.id);
    state.goals = input.goals ?? [];

    let metadata = createLiveMetadata(object, state, input.layer ?? "working");
    metadata = this.indexes.index(metadata);

    this.graph.addObject(object, metadata);

    await this.bus.emit({ type: "metadata.created", objectId: object.id, payload: { address: object.address }, actor: "observer" });
    await this.bus.emit({ type: "metadata.indexed", objectId: object.id, payload: { indexes: metadata.indexes }, actor: "index-manager" });
    await this.bus.emit({ type: "metadata.ready", objectId: object.id, payload: { layer: metadata.location.layer }, actor: "fabric" });

    return { object, state, metadata };
  }

  async link(fromId: string, toId: string, type: RelationshipType): Promise<void> {
    const rel = this.graph.link(fromId, toId, type);
    await this.bus.emit({ type: "metadata.linked", objectId: fromId, payload: rel, actor: "relationship-engine" });
    await this.bus.emit({ type: "metadata.relationship_changed", objectId: toId, payload: rel, actor: "relationship-engine" });
  }

  async move(objectId: string, targetLayer: MemoryLayer, actorRole = "engine"): Promise<LiveMetadata> {
    const metadata = this.graph.getMetadata(objectId);
    if (!metadata) throw new Error(`metadata not found for ${objectId}`);

    const decision = this.protection.canMove(metadata, targetLayer, actorRole);
    if (!decision.allowed) {
      await this.bus.emit({ type: "metadata.permission_changed", objectId, payload: { decision }, actor: "protection-gate" });
      throw new Error(decision.reason);
    }

    const next = this.graph.updateMetadata(objectId, {
      location: { ...metadata.location, layer: targetLayer },
      movement: { ...metadata.movement, currentLayer: targetLayer }
    });

    await this.bus.emit({ type: "metadata.moved", objectId, payload: { from: metadata.location.layer, to: targetLayer }, actor: "execution-engine" });
    return next;
  }

  async seal(objectId: string): Promise<LiveMetadata> {
    const metadata = this.graph.getMetadata(objectId);
    if (!metadata) throw new Error(`metadata not found for ${objectId}`);

    const next = this.graph.updateMetadata(objectId, {
      status: "sealed",
      location: { ...metadata.location, layer: "vault" },
      protection: { ...metadata.protection, accessLevel: "sealed", encryptionRequired: true, auditRequired: true }
    });

    await this.bus.emit({ type: "metadata.sealed", objectId, payload: { layer: "vault" }, actor: "protection-gate" });
    return next;
  }
}
