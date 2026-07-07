import { LiveMetadataFabric } from "../core/fabric.js";
import { attachCoreEngineLogging } from "../engines/engine-subscriptions.js";

const fabric = new LiveMetadataFabric();
attachCoreEngineLogging(fabric);

console.log("\nEXOTIC SDK LIVE METADATA FABRIC DEMO\n");

const sdk = await fabric.observe({
  type: "project",
  name: "Exotic SDK",
  owner: "Mingo",
  layer: "project",
  goals: ["universal-state", "live-metadata", "protected-memory"]
});

const memory = await fabric.observe({
  type: "memory",
  name: "Universal Memory Graph",
  owner: "Mingo",
  layer: "knowledge",
  goals: ["index", "protect", "retrieve", "move"]
});

const objectModel = await fabric.observe({
  type: "code",
  name: "Universal Object Model",
  owner: "Mingo",
  layer: "working",
  goals: ["standardize", "compose", "connect"]
});

await fabric.link(sdk.object.id, memory.object.id, "contains");
await fabric.link(memory.object.id, objectModel.object.id, "references");
await fabric.move(objectModel.object.id, "knowledge");
await fabric.seal(memory.object.id);

console.log("\nLIVE GRAPH SUMMARY");
console.log({
  objects: fabric.graph.objects.size,
  metadata: fabric.graph.metadata.size,
  relationships: fabric.graph.relationships.size,
  knowledgeLayer: fabric.indexes.byLayer("knowledge").length,
  searchMemory: fabric.indexes.searchKeyword("memory")
});

console.log("\nOBJECTS");
for (const object of fabric.graph.objects.values()) {
  const metadata = fabric.graph.getMetadata(object.id);
  console.log(`${object.name} | ${object.address} | layer=${metadata?.location.layer} | access=${metadata?.protection.accessLevel}`);
}
