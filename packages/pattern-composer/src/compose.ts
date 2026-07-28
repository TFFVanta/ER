import { findPattern, type RoadmapPattern, type RoadmapPatternStep } from "./patterns.js";

export interface ComposedRoadmapStep extends RoadmapPatternStep {
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "blocked";
  progress: number;
}

export interface ComposeRoadmapOptions {
  overrides?: Record<string, Partial<Pick<ComposedRoadmapStep, "status" | "progress">>>;
}

export class PatternValidationError extends Error {}

// Same class of checks codex-bridge-runtime.mjs's buildRoadmapProductionFabric applies to a
// live roadmap (unknown-dependency / cycle detection) - applied here at pattern-definition
// time instead, so a broken pattern fails fast rather than producing a roadmap that only
// breaks once the bridge tries to layer it.
// Exported so a pattern can be validated on its own - e.g. before registering a new one in
// patterns.ts, or in a test - without needing to go through composeRoadmap's name lookup.
export function validatePattern(pattern: RoadmapPattern): void {
  const ids = new Set(pattern.steps.map((step) => step.id));
  const unknown: string[] = [];
  for (const step of pattern.steps) {
    for (const dependencyId of step.dependsOn) {
      if (!ids.has(dependencyId)) unknown.push(`${step.id} depends on unknown step ${dependencyId}`);
    }
  }
  if (unknown.length) {
    throw new PatternValidationError(
      `Pattern "${pattern.name}" has unknown dependencies: ${unknown.join("; ")}`,
    );
  }

  const stepsById = new Map(pattern.steps.map((step) => [step.id, step]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: readonly string[]): void => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      throw new PatternValidationError(
        `Pattern "${pattern.name}" has a dependency cycle: ${[...path, id].join(" -> ")}`,
      );
    }
    state.set(id, "visiting");
    for (const dependencyId of stepsById.get(id)!.dependsOn) {
      visit(dependencyId, [...path, id]);
    }
    state.set(id, "done");
  };
  for (const step of pattern.steps) visit(step.id, []);
}

// Produces a fresh roadmap array ready to write to roadmap.json. Every step starts
// "pending"/0% unless explicitly overridden - callers apply a pattern to seed a new roadmap,
// not to resurrect a partially-completed one (that's what --force existing without overrides
// would silently discard, which is why the CLI layer requires --force to apply over an
// existing roadmap.json at all).
export function composeRoadmap(
  patternName: string,
  options: ComposeRoadmapOptions = {},
): ComposedRoadmapStep[] {
  const pattern = findPattern(patternName);
  if (!pattern) {
    throw new Error(`Unknown roadmap pattern: ${patternName}`);
  }
  validatePattern(pattern);

  return pattern.steps.map((step) => {
    const override = options.overrides?.[step.id];
    return {
      ...step,
      dependsOn: [...step.dependsOn],
      status: override?.status ?? "pending",
      progress: override?.progress ?? 0,
    };
  });
}
