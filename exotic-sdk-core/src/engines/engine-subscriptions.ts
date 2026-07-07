import type { LiveMetadataFabric } from "../core/fabric.js";
import type { EngineName, MetadataEventType } from "../core/types.js";

const subscriptions: Record<EngineName, MetadataEventType[]> = {
  observer: ["metadata.created", "metadata.observed", "metadata.quality_changed"],
  alignment: ["metadata.updated", "metadata.relationship_changed", "metadata.prediction_changed"],
  memory: ["metadata.created", "metadata.moved", "metadata.archived", "metadata.sealed"],
  prediction: ["metadata.updated", "metadata.quality_changed", "metadata.prediction_changed"],
  execution: ["metadata.ready", "metadata.permission_changed", "metadata.moved"],
  learning: ["metadata.quality_changed", "metadata.relationship_changed", "metadata.indexed"],
  relationship: ["metadata.linked", "metadata.relationship_changed"]
};

export function attachCoreEngineLogging(fabric: LiveMetadataFabric): void {
  for (const [engine, events] of Object.entries(subscriptions) as [EngineName, MetadataEventType[]][]) {
    for (const eventType of events) {
      fabric.bus.subscribe(eventType, (event) => {
        console.log(`[${engine}] received ${event.type} for ${event.objectId}`);
      });
    }
  }
}
