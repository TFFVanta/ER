import React, { useEffect, useEffectEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  ChevronRight,
  Command,
  Compass,
  FolderKanban,
  Menu,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TowerControl,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import "./styles.css";
import { listReservedHosts, resolveSurface } from "./portalConfig.js";

const primaryTabs = [
  { id: "overview", label: "Overview", short: "Home", icon: Compass },
  { id: "system", label: "System", short: "System", icon: Boxes },
  { id: "artifacts", label: "Artifacts", short: "Builds", icon: FolderKanban },
  { id: "trust", label: "Trust", short: "Trust", icon: ShieldCheck },
];

const platformPillars = [
  {
    title: "Objectives",
    detail: "EXOTIC turns broad direction into structured objectives, tracked execution, and linked evidence.",
  },
  {
    title: "Studios",
    detail: "Ideas, product, design, website, development, marketing, workflows, and operations share one workspace.",
  },
  {
    title: "Workflows",
    detail: "The platform coordinates repeatable execution instead of leaving work scattered across disconnected tools.",
  },
  {
    title: "Evidence",
    detail: "Artifacts, decisions, and operational history stay attached to the work that produced them.",
  },
];

const capabilityCards = [
  {
    title: "Venture workspace",
    detail: "A single EXOTIC environment for planning, building, launching, and operating real projects.",
    icon: Compass,
  },
  {
    title: "Execution systems",
    detail: "Connected runtime, workflows, and operations surfaces for moving from intent to implementation.",
    icon: Workflow,
  },
  {
    title: "Artifact production",
    detail: "Outputs are meant to be real, editable, and deployable instead of static concept decks.",
    icon: ScrollText,
  },
  {
    title: "Operational control",
    detail: "Portal and ops surfaces separate user work from administrative and runtime controls.",
    icon: TowerControl,
  },
];

const artifactCards = [
  {
    title: "EXOTIC Portal",
    detail: "Public and authenticated workspace surfaces for navigating the platform.",
    source: "root src/",
  },
  {
    title: "Operations Console v1.0",
    detail: "Dedicated operations console implementation for runtime oversight and control.",
    source: "operations-console/",
  },
  {
    title: "Continuous Operations Runtime v1.0",
    detail: "Underlying runtime layer for service lifecycle, telemetry, health, and recovery.",
    source: "exotic-continuous-operations-v1.0/",
  },
  {
    title: "EXOTIC Studio",
    detail: "Additional app surface for studio-focused workflows and creation flows.",
    source: "exotic-studio/",
  },
];

const trustItems = [
  "Public, authenticated, and operational surfaces should stay separate.",
  "Production deploys should move through Git, validation, health checks, and rollback.",
  "DNS and mail records must be preserved before any domain cutover or record edits.",
  "No runtime state should be shown as live unless it is backed by a real source.",
];

function App() {
  const surface = useMemo(() => resolveSurface(window.location.hostname), []);
  const hostEntries = useMemo(() => listReservedHosts(), []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const commandItems = useMemo(
    () => [
      { id: "overview", title: "Overview", subtitle: "What EXOTIC is", href: "#overview" },
      { id: "system", title: "System pillars", subtitle: "Core platform structure", href: "#system" },
      { id: "artifacts", title: "Artifacts", subtitle: "Current platform surfaces", href: "#artifacts" },
      { id: "trust", title: "Trust and operations", subtitle: "Deployment and safety posture", href: "#trust" },
      { id: "portal", title: "Portal host", subtitle: "portal.mingo.center", href: "https://portal.mingo.center" },
      { id: "ops", title: "Ops host", subtitle: "ops.mingo.center", href: "https://ops.mingo.center" },
    ],
    [],
  );

  const handleGlobalKey = useEffectEvent((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPaletteOpen(true);
    }

    if (event.key === "Escape") {
      setPaletteOpen(false);
      setSheetOpen(false);
    }
  });

  useEffect(() => {
    const onKeyDown = (event) => handleGlobalKey(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleGlobalKey]);

  function navigateTo(target) {
    setPaletteOpen(false);
    setSheetOpen(false);

    if (target.startsWith("#")) {
      const element = document.querySelector(target);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.location.assign(target);
  }

  return (
    <div className="siteShell">
      <header className="topbar">
        <button
          type="button"
          className="iconButton"
          aria-label={sheetOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setSheetOpen((open) => !open)}
        >
          {sheetOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="brandCluster">
          <div className="brandStamp">
            <img src="/er-logo.png" alt="EXOTIC logo" />
          </div>
          <div>
            <strong>{surface.identity}</strong>
            <span>{surface.productLine.toUpperCase()}</span>
          </div>
        </div>

        <button type="button" className="iconButton" onClick={() => setPaletteOpen(true)}>
          <Command size={18} />
        </button>
      </header>

      <div className={`navSheet ${sheetOpen ? "open" : ""}`}>
        <nav className="sheetNav" aria-label="Sections">
          {primaryTabs.map(({ id, label, short, icon: Icon }) => (
            <button key={id} type="button" onClick={() => navigateTo(`#${id}`)}>
              <span className="sheetNavIcon">
                <Icon size={18} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{short}</small>
              </span>
            </button>
          ))}
        </nav>
      </div>

      <main className="pageFrame">
        <section className="heroCard" id="overview">
          <p className="eyebrow">{surface.eyebrow}</p>
          <h1>{surface.title}</h1>
          <p className="heroText">{surface.description}</p>

          <div className="heroActions">
            <button type="button" className="primaryButton" onClick={() => navigateTo(surface.ctaHref)}>
              <span>{surface.ctaLabel}</span>
              <ArrowRight size={18} />
            </button>
            <button type="button" className="secondaryButton" onClick={() => navigateTo("#artifacts")}>
              <span>Inspect current artifacts</span>
            </button>
          </div>

          <div className="heroFacts">
            <InfoPill label="Mission" value="Connected execution" />
            <InfoPill label="State" value={surface.status} />
            <InfoPill label="Model" value="Git-driven deployment" />
          </div>
        </section>

        <section className="sectionCard" id="system">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">System</p>
              <h2>What EXOTIC actually is</h2>
            </div>
            <Boxes size={18} />
          </div>

          <p className="sectionIntro">
            EXOTIC is an AI-native operating workspace. It is meant to unify objectives, studios,
            workflows, artifacts, runtime systems, and evidence in one coordinated environment.
          </p>

          <div className="pillarGrid">
            {platformPillars.map((pillar) => (
              <article key={pillar.title} className="infoCard">
                <strong>{pillar.title}</strong>
                <p>{pillar.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Capabilities</p>
              <h2>What the platform is built to do</h2>
            </div>
            <Wrench size={18} />
          </div>

          <div className="capabilityGrid">
            {capabilityCards.map(({ title, detail, icon: Icon }) => (
              <article key={title} className="capabilityCard">
                <div className="capabilityIcon">
                  <Icon size={18} />
                </div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionCard" id="artifacts">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Artifacts</p>
              <h2>Current EXOTIC implementation surfaces</h2>
            </div>
            <FolderKanban size={18} />
          </div>

          <div className="artifactGrid">
            {artifactCards.map((artifact) => (
              <article key={artifact.title} className="artifactCard">
                <strong>{artifact.title}</strong>
                <p>{artifact.detail}</p>
                <span>{artifact.source}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Surface Map</p>
              <h2>Reserved production hosts</h2>
            </div>
            <Sparkles size={18} />
          </div>

          <div className="hostGrid">
            {hostEntries.map((entry) => (
              <article key={entry.hostname} className="hostCard">
                <strong>{entry.hostname}</strong>
                <p>{entry.surface}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionCard" id="trust">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Trust</p>
              <h2>Operational and deployment posture</h2>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="trustList">
            {trustItems.map((item) => (
              <article key={item} className="trustItem">
                <ShieldCheck size={16} />
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Entry Points</p>
              <h2>Where to go next</h2>
            </div>
            <BookOpen size={18} />
          </div>

          <div className="linkGrid">
            <button type="button" className="linkCard" onClick={() => navigateTo("https://portal.mingo.center")}>
              <div>
                <strong>Portal</strong>
                <p>Authenticated EXOTIC workspace</p>
              </div>
              <ChevronRight size={18} />
            </button>

            <button type="button" className="linkCard" onClick={() => navigateTo("https://ops.mingo.center")}>
              <div>
                <strong>Operations Console</strong>
                <p>Operational control surface</p>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </main>

      {paletteOpen ? (
        <div className="overlay" onClick={() => setPaletteOpen(false)}>
          <div
            className="commandPalette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="paletteHeader">
              <div>
                <p className="eyebrow">Command Deck</p>
                <h2>Jump to a surface or section</h2>
              </div>
              <button type="button" className="iconButton" onClick={() => setPaletteOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="commandList">
              {commandItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="commandItem"
                  onClick={() => navigateTo(item.href)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="infoPill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
