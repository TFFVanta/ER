export interface RoadmapPatternStep {
  id: string;
  title: string;
  summary: string;
  expectedDuration: string;
  priority: string;
  owner: string;
  lane: string;
  dependsOn: readonly string[];
}

export interface RoadmapPattern {
  name: string;
  description: string;
  steps: readonly RoadmapPatternStep[];
}

// The real, current "Phase 1" roadmap - previously duplicated as a shorter, drifted 6-item
// seed hardcoded in codex-bridge-runtime.mjs's ensureBridgeFiles() while the live
// .exotic/codex-bridge/roadmap.json had grown to this fuller 16-item version. Extracted here
// as the one source of truth both the seed and `exo pattern apply` compose from.
const phase1Foundation: RoadmapPattern = {
  name: "phase1-foundation",
  description:
    "Stabilize the monorepo, lock the venture model and workspace shell, generate the first " +
    "venture workspace, then initialize all ten studios and close out with evidence and a " +
    "morning handoff summary.",
  steps: [
    {
      id: "P1-01",
      title: "Stabilize the monorepo build baseline",
      summary:
        "Confirm the current package, contract, entity, and console baseline is stable enough to support overnight structured work.",
      expectedDuration: "45-90 min",
      priority: "Critical",
      owner: "Codex",
      lane: "foundation",
      dependsOn: [],
    },
    {
      id: "P1-02",
      title: "Lock the canonical venture model",
      summary:
        "Advance the shared venture, objective, artifact, approval, evidence, and workflow model into the active EXOTIC operating baseline.",
      expectedDuration: "60-120 min",
      priority: "Critical",
      owner: "Codex",
      lane: "canon",
      dependsOn: ["P1-01"],
    },
    {
      id: "P1-03",
      title: "Lock the shared workspace shell",
      summary:
        "Advance the single connected EXOTIC workspace shell as the governing surface across studios and operations.",
      expectedDuration: "90-180 min",
      priority: "Critical",
      owner: "Codex",
      lane: "workspace",
      dependsOn: ["P1-02"],
    },
    {
      id: "P1-04",
      title: "Generate the first venture workspace",
      summary:
        "Turn the broad request into the first structured venture workspace with shared records, tasks, artifacts, approvals, and evidence.",
      expectedDuration: "45-75 min",
      priority: "Critical",
      owner: "Codex",
      lane: "workspace",
      dependsOn: ["P1-03"],
    },
    {
      id: "P1-05",
      title: "Initialize the Ideas studio",
      summary: "Materialize the Ideas studio workspace and its initial opportunity framing surface.",
      expectedDuration: "25-40 min",
      priority: "High",
      owner: "Codex",
      lane: "ideas",
      dependsOn: ["P1-04"],
    },
    {
      id: "P1-06",
      title: "Initialize the Business studio",
      summary:
        "Materialize the Business studio workspace for strategy, assumptions, operating model, and approvals context.",
      expectedDuration: "35-60 min",
      priority: "High",
      owner: "Codex",
      lane: "business",
      dependsOn: ["P1-05", "P1-12"],
    },
    {
      id: "P1-07",
      title: "Initialize the Product studio",
      summary:
        "Materialize the Product studio workspace for scope, requirements, milestones, and release logic.",
      expectedDuration: "35-60 min",
      priority: "High",
      owner: "Codex",
      lane: "product",
      dependsOn: ["P1-06"],
    },
    {
      id: "P1-08",
      title: "Initialize the Design studio",
      summary: "Materialize the Design studio workspace for brand, interaction, and interface system work.",
      expectedDuration: "30-50 min",
      priority: "High",
      owner: "Codex",
      lane: "design",
      dependsOn: ["P1-07"],
    },
    {
      id: "P1-09",
      title: "Initialize the Website studio",
      summary:
        "Materialize the Website studio workspace for publishing, structure, and public-facing implementation work.",
      expectedDuration: "30-50 min",
      priority: "High",
      owner: "Codex",
      lane: "website",
      dependsOn: ["P1-08", "P1-10", "P1-11"],
    },
    {
      id: "P1-10",
      title: "Initialize the Development studio",
      summary:
        "Materialize the Development studio workspace for implementation, code changes, and technical execution.",
      expectedDuration: "45-90 min",
      priority: "High",
      owner: "Codex",
      lane: "development",
      dependsOn: ["P1-07"],
    },
    {
      id: "P1-11",
      title: "Initialize the Marketing studio",
      summary:
        "Materialize the Marketing studio workspace for positioning, channels, campaigns, and launch support.",
      expectedDuration: "30-55 min",
      priority: "High",
      owner: "Codex",
      lane: "marketing",
      dependsOn: ["P1-06", "P1-07"],
    },
    {
      id: "P1-12",
      title: "Initialize the Research studio",
      summary:
        "Materialize the Research studio workspace for evidence gathering, source capture, and findings synthesis.",
      expectedDuration: "30-55 min",
      priority: "High",
      owner: "Codex",
      lane: "research",
      dependsOn: ["P1-04"],
    },
    {
      id: "P1-13",
      title: "Initialize the Workflows studio",
      summary:
        "Materialize the Workflows studio workspace for execution flows, automations, and handoff logic.",
      expectedDuration: "40-70 min",
      priority: "High",
      owner: "Codex",
      lane: "workflows",
      dependsOn: ["P1-07"],
    },
    {
      id: "P1-14",
      title: "Initialize the Operations studio",
      summary:
        "Materialize the Operations studio workspace for metrics, runtime control, review, and health monitoring.",
      expectedDuration: "30-50 min",
      priority: "High",
      owner: "Codex",
      lane: "operations",
      dependsOn: ["P1-09", "P1-13"],
    },
    {
      id: "P1-15",
      title: "Update evidence and metrics surfaces",
      summary:
        "Advance evidence records, current-state reporting, and metrics coverage so overnight work is visibly auditable.",
      expectedDuration: "25-45 min",
      priority: "High",
      owner: "Codex",
      lane: "evidence",
      dependsOn: [
        "P1-05",
        "P1-06",
        "P1-07",
        "P1-08",
        "P1-09",
        "P1-10",
        "P1-11",
        "P1-12",
        "P1-13",
        "P1-14",
      ],
    },
    {
      id: "P1-16",
      title: "Prepare the morning review summary",
      summary:
        "Advance the workspace into a clear morning handoff with completed steps, current state, and the next operator decisions.",
      expectedDuration: "20-35 min",
      priority: "High",
      owner: "Codex",
      lane: "reporting",
      dependsOn: ["P1-15"],
    },
  ],
};

export const roadmapPatterns: readonly RoadmapPattern[] = [phase1Foundation];

export function findPattern(name: string): RoadmapPattern | undefined {
  return roadmapPatterns.find((pattern) => pattern.name === name);
}
