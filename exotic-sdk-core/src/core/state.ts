export type UniversalState = {
  objectId: string;
  health: number;
  confidence: number;
  alignment: number;
  freshness: number;
  trust: number;
  relevance: number;
  resources: {
    memory?: number;
    cpu?: number;
    gpu?: number;
    network?: number;
    disk?: number;
    tokens?: number;
  };
  intent?: string;
  goals: string[];
  observedAt: string;
};

export function createInitialState(objectId: string): UniversalState {
  return {
    objectId,
    health: 1,
    confidence: 1,
    alignment: 1,
    freshness: 1,
    trust: 1,
    relevance: 0.5,
    resources: {},
    goals: [],
    observedAt: new Date().toISOString()
  };
}

export function scoreStateQuality(state: UniversalState): number {
  return average([
    state.health,
    state.confidence,
    state.alignment,
    state.freshness,
    state.trust,
    state.relevance
  ]);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
