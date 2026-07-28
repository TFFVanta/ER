import type { LiveMetadata } from "./metadata";

export class IndexManager {
  private keywordIndex = new Map<string, Set<string>>();
  private layerIndex = new Map<string, Set<string>>();

  index(metadata: LiveMetadata): LiveMetadata {
    this.add(this.layerIndex, metadata.location.layer, metadata.objectId);
    for (const token of tokenize(`${metadata.type} ${metadata.subtype ?? ""} ${metadata.address}`)) {
      this.add(this.keywordIndex, token, metadata.objectId);
    }

    return {
      ...metadata,
      indexes: {
        keyword: true,
        semantic: false,
        temporal: true,
        graph: true,
        permission: true,
        alignment: true
      }
    };
  }

  searchKeyword(query: string): string[] {
    const results = new Set<string>();
    for (const token of tokenize(query)) {
      for (const id of this.keywordIndex.get(token) ?? []) results.add(id);
    }
    return [...results];
  }

  byLayer(layer: string): string[] {
    return [...(this.layerIndex.get(layer) ?? [])];
  }

  private add(index: Map<string, Set<string>>, key: string, value: string): void {
    const set = index.get(key) ?? new Set<string>();
    set.add(value);
    index.set(key, set);
  }
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
