import "./App.css";

const engines = [
  { name: "Core", code: "SYS" },
  { name: "Registry", code: "REG" },
  { name: "Reflection", code: "RFX" },
  { name: "Manifest", code: "MNF" },
  { name: "Graph", code: "GRF" },
  { name: "Generator", code: "GEN" }
];

const templates = [
  { name: "App", code: "APP" },
  { name: "Website", code: "WEB" },
  { name: "Game", code: "GME" },
  { name: "AI Agent", code: "AGT" },
  { name: "Dashboard", code: "DSH" },
  { name: "Business OS", code: "BOS" }
];

const graphNodes = [
  { name: "EXOTIC", meta: "Root", x: "50%", y: "50%", tone: "core", large: true },
  { name: "Core", meta: "SYS", x: "22%", y: "22%", tone: "cyan" },
  { name: "Registry", meta: "REG", x: "77%", y: "22%", tone: "rose" },
  { name: "Graph", meta: "GRF", x: "25%", y: "77%", tone: "mint" },
  { name: "Generator", meta: "GEN", x: "79%", y: "74%", tone: "gold" },
  { name: "Manifest", meta: "MNF", x: "10%", y: "52%", tone: "slate" }
];

const graphLinks = [
  "route",
  "learn",
  "build",
  "bind"
];

export default function App() {
  return (
    <main className="studio">
      <header className="top">
        <div>
          <h1>EXOTIC</h1>
          <p>STUDIO</p>
        </div>
        <div className="topStats">
          <span>MODE BUILD</span>
          <span>AI READY</span>
        </div>
      </header>

      <section className="grid">
        <aside className="rail">
          <div className="sectionHead">
            <h2>Engines</h2>
            <span>6</span>
          </div>
          {engines.map((item) => (
            <button key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.code}</span>
            </button>
          ))}

          <div className="sectionHead sectionHeadTemplates">
            <h2>Templates</h2>
            <span>6</span>
          </div>
          {templates.map((item) => (
            <button key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.code}</span>
            </button>
          ))}
        </aside>

        <section className="canvas">
          <div className="canvasHead">
            <h2>Universal Graph</h2>
            <div className="canvasMeta">
              <span>ROUTE</span>
              <span>LEARN</span>
              <span>BUILD</span>
            </div>
          </div>

          <div className="graph">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 50 50 L 22 22" />
              <path d="M 50 50 L 77 22" />
              <path d="M 50 50 L 25 77" />
              <path d="M 50 50 L 79 74" />
              <path d="M 50 50 L 10 52" />
            </svg>
            {graphNodes.map((node) => (
              <div
                key={node.name}
                className={`node node--${node.tone} ${node.large ? "node--large" : ""}`}
                style={{ left: node.x, top: node.y }}
              >
                <strong>{node.name}</strong>
                <span>{node.meta}</span>
              </div>
            ))}
            <div className="graphLegend">
              {graphLinks.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="inspector">
          <div className="sectionHead">
            <h2>Inspector</h2>
            <span>LIVE</span>
          </div>
          <div className="stat"><span>Status</span><strong>Active</strong></div>
          <div className="stat"><span>Mode</span><strong>Build</strong></div>
          <div className="stat"><span>Graph</span><strong>Native</strong></div>
          <div className="stat"><span>AI</span><strong>Ready</strong></div>
          <div className="stat"><span>Templates</span><strong>Online</strong></div>
        </aside>
      </section>
    </main>
  );
}
