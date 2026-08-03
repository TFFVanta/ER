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
    title: "Authorization required",
    detail: "No program runs without an explicit authorization attestation on file. No attestation, no scan - not a policy, a gate.",
  },
  {
    title: "Hard budget ceilings",
    detail: "$5/day, $100/month, 500 requests/day, 60 runtime-minutes/day by default. Cycles stop themselves before they cost you anything unplanned.",
  },
  {
    title: "Passive-only by design",
    detail: "Execution class is safe-passive: HTTPS posture and header checks, never active exploitation.",
  },
  {
    title: "One global kill switch",
    detail: "A single switch halts every running cycle immediately, regardless of what's in flight.",
  },
];

const capabilityCards = [
  {
    title: "Scope-locked",
    detail: "Programs are locked to their attested authorization; scope-bypass is on the immutable prohibited list, not left to judgment.",
    icon: ShieldCheck,
  },
  {
    title: "Budget-gated, not just monitored",
    detail: "Daily and monthly dollar, request, and runtime ceilings are enforced before each cycle starts, not audited after the fact.",
    icon: TowerControl,
  },
  {
    title: "Nothing destructive, ever",
    detail: "No denial-of-service, credential stuffing, password spraying, social engineering, phishing, malware, persistence, or destructive data access - by immutable list, not by prompt.",
    icon: Wrench,
  },
  {
    title: "Evidence per cycle",
    detail: "Every cycle records what it checked, what it found, and what budget it spent - not just a status claim.",
    icon: ScrollText,
  },
];

const artifactCards = [
  {
    title: "Daily ceiling",
    detail: "Hard stop once today's spend or request count is reached - no operator action required.",
    source: "$5.00 / 500 requests",
  },
  {
    title: "Monthly ceiling",
    detail: "A second, independent cap so a busy day can't quietly run through a month's budget.",
    source: "$100.00",
  },
  {
    title: "Runtime ceiling",
    detail: "Even with budget remaining, EXOTIC won't run longer than this per day.",
    source: "60 minutes / day",
  },
  {
    title: "Concurrency limit",
    detail: "Caps how much runs at once, independent of the dollar and request budgets.",
    source: "2 concurrent",
  },
];

const trustItems = [
  "Authorization is attested per program, explicitly, before anything runs against it.",
  "Denial-of-service, credential stuffing, password spraying, social engineering, phishing, malware deployment, persistence, destructive data access, third-party targeting, and scope-bypass are on an immutable prohibited list.",
  "Budget, request, and runtime ceilings are enforced pre-cycle, not reviewed after the fact.",
  "A global kill switch halts every running cycle immediately.",
  "No runtime state is shown as live unless it is backed by a real source.",
];

function App() {
  const surface = useMemo(() => resolveSurface(window.location.hostname), []);
  const hostEntries = useMemo(() => listReservedHosts(), []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const commandItems = useMemo(
    () => [
      { id: "overview", title: "Overview", subtitle: "What EXOTIC is", href: "#overview" },
      { id: "system", title: "Safety pillars", subtitle: "Authorization, budget, passivity, kill switch", href: "#system" },
      { id: "artifacts", title: "Budget", subtitle: "Default ceilings", href: "#artifacts" },
      { id: "trust", title: "Trust and operations", subtitle: "The immutable prohibited list", href: "#trust" },
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
              <span>See the default budget</span>
            </button>
          </div>

          <div className="heroFacts">
            <InfoPill label="Execution class" value="Safe-passive" />
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
            EXOTIC is a narrow, safety-first automation layer for authorized bug bounty
            reconnaissance - not a general scanner, not an exploitation tool. It exists to give
            security teams and independent researchers continuous authorized coverage without the
            risk of an over-eager script doing something nobody authorized.
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
              <p className="eyebrow">Budget</p>
              <h2>Default ceilings, enforced pre-cycle</h2>
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
                <p>Internal operator workspace, not a customer sign-up</p>
              </div>
              <ChevronRight size={18} />
            </button>

            <button type="button" className="linkCard" onClick={() => navigateTo("https://ops.mingo.center")}>
              <div>
                <strong>Operations Console</strong>
                <p>Internal runtime control, not a customer surface</p>
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
