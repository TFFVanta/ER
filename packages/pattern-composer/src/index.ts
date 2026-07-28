export { roadmapPatterns, findPattern } from "./patterns.js";
export type { RoadmapPattern, RoadmapPatternStep } from "./patterns.js";

export { composeRoadmap, validatePattern, PatternValidationError } from "./compose.js";
export type { ComposedRoadmapStep, ComposeRoadmapOptions } from "./compose.js";

export const identity = {
  name: "@exotic/pattern-composer",
  tagline: "Everything Is Exotic.",
};
