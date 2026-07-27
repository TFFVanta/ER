const surfaceDefinitions = {
  public: {
    key: "public",
    productLine: "EXOTIC operating workspace",
    identity: "EXOTIC",
    eyebrow: "Official Public Frontend",
    title: "EXOTIC is the operating workspace for venture creation, execution, and evidence.",
    description:
      "Use the public home to explain the EXOTIC platform, show its real system surfaces, and route people into the authenticated workspace and operations layers.",
    mission: "Public EXOTIC launch",
    status: "Public home",
    ctaLabel: "Open portal entry",
    ctaHref: "https://portal.mingo.center",
  },
  portal: {
    key: "portal",
    productLine: "Authenticated EXOTIC workspace",
    identity: "EXOTIC Portal",
    eyebrow: "Authenticated Portal",
    title: "Portal is the secure EXOTIC workspace for objectives, projects, workflows, and artifacts.",
    description:
      "Use the portal for authenticated workspace control, venture execution, and connected operational work across the EXOTIC system.",
    mission: "Secure portal continuity",
    status: "Authenticated",
    ctaLabel: "Open operations console",
    ctaHref: "https://ops.mingo.center",
  },
  ops: {
    key: "ops",
    productLine: "Operations console",
    identity: "EXOTIC Ops",
    eyebrow: "Operations Console",
    title: "Ops is the command surface for runtime control, operational telemetry, and execution oversight.",
    description:
      "Separate operations from the public home so the console can stay focused on incidents, runtime health, rollback, and deployment movement.",
    mission: "Operational command",
    status: "Ops live",
    ctaLabel: "Return to public home",
    ctaHref: "https://mingo.center",
  },
  api: {
    key: "api",
    productLine: "Production API surface",
    identity: "EXOTIC API",
    eyebrow: "API Surface",
    title: "API is reserved for production service traffic and machine integrations.",
    description:
      "Keep the API hostname distinct from the human-facing frontend so operational controls, authentication, and service boundaries remain clear.",
    mission: "Service boundary",
    status: "Reserved",
    ctaLabel: "Open docs",
    ctaHref: "https://docs.mingo.center",
  },
  status: {
    key: "status",
    productLine: "System status surface",
    identity: "EXOTIC Status",
    eyebrow: "Status Surface",
    title: "Status should present uptime, incidents, and platform health without exposing control functions.",
    description:
      "Use the status hostname for public-facing trust signals, incident updates, and recovery notes tied to the production system.",
    mission: "Trust reporting",
    status: "Reserved",
    ctaLabel: "Open public home",
    ctaHref: "https://mingo.center",
  },
  docs: {
    key: "docs",
    productLine: "Documentation surface",
    identity: "EXOTIC Docs",
    eyebrow: "Documentation",
    title: "Docs should explain the EXOTIC platform, architecture, and entry points without pretending the runtime is already live.",
    description:
      "Use the docs hostname for architecture, onboarding, API references, and controlled explanations of the EXOTIC platform.",
    mission: "Knowledge access",
    status: "Reserved",
    ctaLabel: "Open public home",
    ctaHref: "https://mingo.center",
  },
};

const hostSurfaceMap = {
  "mingo.center": "public",
  "www.mingo.center": "public",
  "portal.mingo.center": "portal",
  "ops.mingo.center": "ops",
  "api.mingo.center": "api",
  "status.mingo.center": "status",
  "docs.mingo.center": "docs",
};

export function resolveSurface(hostname) {
  const normalized = (hostname || "").toLowerCase();
  const mappedKey = hostSurfaceMap[normalized] || "public";
  return surfaceDefinitions[mappedKey];
}

export function listReservedHosts() {
  return Object.entries(hostSurfaceMap).map(([hostname, surface]) => ({
    hostname,
    surface,
  }));
}
