 import "./App.css";

const engines = ["Core", "Registry", "Reflection", "Manifest", "Graph", "Generator"];
const templates = ["App", "Website", "Game", "AI Agent", "Dashboard", "Business OS"];

export default function App() {
  return (
    <main className="studio">
      <header className="top">
        <h1>EXOTIC</h1>
        <p>STUDIO - CREATOR OS</p>
      </header>

      <section className="grid">
        <aside>
          <h2>Explorer</h2>
          {engines.map((item) => <button key={item}>{item}</button>)}

          <h2>Templates</h2>
          {templates.map((item) => <button key={item}>{item}</button>)}
        </aside>

        <section className="canvas">
          <h2>Universal Graph</h2>
          <div className="star">?</div>
          <p>Observe - Map - Predict - Align - Act - Measure - Learn</p>
        </section>

        <aside>
          <h2>Inspector</h2>
          <p>Status: Active</p>
          <p>Mode: Build System</p>
          <p>Architecture: Graph Native</p>
          <p>AI: Ready</p>
          <p>Templates: Online</p>
        </aside>
      </section>
    </main>
  );
}

