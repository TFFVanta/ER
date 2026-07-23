import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Command, LayoutDashboard, FolderKanban, Bot, Workflow,
  Activity, BarChart3, FlaskConical, ShieldCheck, Settings, Bell,
  Plus, ChevronRight, Cpu, Zap, CheckCircle2, CircleDot, Menu, X
} from "lucide-react";
import "./styles.css";

const projects = [
  { name: "Exotic Portal", status: "Building", progress: 78, accent: "pink" },
  { name: "Continuity Engine", status: "Architecture", progress: 52, accent: "blue" },
  { name: "MINGO Advertising OS", status: "Prototype", progress: 41, accent: "yellow" },
  { name: "Universal Memory Graph", status: "Stable", progress: 88, accent: "green" },
];

const agents = [
  { name: "Architect", task: "Structuring Portal runtime", state: "Active" },
  { name: "Builder", task: "Compiling interface shell", state: "Active" },
  { name: "Observer", task: "Tracking workspace state", state: "Watching" },
  { name: "Trust", task: "Validating security gates", state: "Ready" },
];

const nav = [
  ["Home", LayoutDashboard],
  ["Projects", FolderKanban],
  ["AI Agents", Bot],
  ["Workflows", Workflow],
  ["Activity", Activity],
  ["Analytics", BarChart3],
  ["Research", FlaskConical],
  ["Trust", ShieldCheck],
  ["Settings", Settings],
];

function App() {
  const [active, setActive] = useState("Home");
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const filtered = useMemo(() =>
    projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button className="iconButton mobileOnly" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X size={19}/> : <Menu size={19}/>}
          </button>
          <img src="/er-logo.png" className="logo" alt="ER logo" />
          <div>
            <strong>EXOTIC</strong>
            <span>PORTAL</span>
          </div>
        </div>

        <button className="searchTrigger" onClick={() => setCommandOpen(true)}>
          <Search size={18}/>
          <span>Search everything or run a command</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="topActions">
          <button className="iconButton"><Bell size={19}/></button>
          <div className="avatar">M</div>
        </div>
      </header>

      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={active === label ? "active" : ""}
              onClick={() => { setActive(label); setMobileNav(false); }}>
              <Icon size={19}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebarFooter">
          <div className="systemPulse"><span></span> Platform healthy</div>
          <small>EXOTIC PLATFORM 0.4</small>
        </div>
      </aside>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">LIVE OPERATING WORKSPACE</p>
            <h1>Good morning, Mingo.</h1>
            <p>Observe. Map. Predict. Align. Act. Measure. Learn.</p>
          </div>
          <button className="primary"><Plus size={18}/> New Project</button>
        </section>

        <section className="metrics">
          <Metric title="Active Projects" value="14" note="+3 this month" kind="pink" />
          <Metric title="AI Agents" value="9" note="4 active now" kind="blue" />
          <Metric title="Momentum" value="87%" note="+12% this week" kind="yellow" />
          <Metric title="Build Health" value="98%" note="All systems stable" kind="green" />
        </section>

        <section className="workspaceGrid">
          <div className="panel projectsPanel">
            <div className="panelHeader">
              <div><p className="eyebrow">WORKSPACE</p><h2>Projects</h2></div>
              <div className="inlineSearch"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter projects"/></div>
            </div>
            <div className="projectList">
              {filtered.map(project => <ProjectRow key={project.name} {...project}/>)}
            </div>
          </div>

          <div className="panel agentsPanel">
            <div className="panelHeader">
              <div><p className="eyebrow">INTELLIGENCE</p><h2>AI Swarm</h2></div>
              <Cpu size={22}/>
            </div>
            <div className="agentList">
              {agents.map(agent => (
                <div className="agent" key={agent.name}>
                  <div className="agentIcon"><Bot size={18}/></div>
                  <div><strong>{agent.name}</strong><p>{agent.task}</p></div>
                  <span className="state">{agent.state}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel graphPanel">
            <div className="panelHeader">
              <div><p className="eyebrow">RELATIONSHIPS</p><h2>Live Graph</h2></div>
              <CircleDot size={22}/>
            </div>
            <div className="graph">
              <div className="node core">EXOTIC</div>
              <div className="node n1">Projects</div>
              <div className="node n2">AI</div>
              <div className="node n3">Memory</div>
              <div className="node n4">Automation</div>
              <svg viewBox="0 0 500 260" preserveAspectRatio="none">
                <line x1="250" y1="130" x2="95" y2="65"/>
                <line x1="250" y1="130" x2="405" y2="65"/>
                <line x1="250" y1="130" x2="95" y2="205"/>
                <line x1="250" y1="130" x2="405" y2="205"/>
              </svg>
            </div>
          </div>

          <div className="panel activityPanel">
            <div className="panelHeader">
              <div><p className="eyebrow">SYSTEM</p><h2>Live Activity</h2></div>
              <Zap size={22}/>
            </div>
            {[
              ["Builder compiled Portal shell", "Now"],
              ["Trust verified execution gate", "2m"],
              ["Observer synchronized workspace", "4m"],
              ["Architect updated project graph", "9m"],
            ].map(([text,time]) => (
              <div className="activityRow" key={text}>
                <CheckCircle2 size={17}/><span>{text}</span><small>{time}</small>
              </div>
            ))}
          </div>
        </section>
      </main>

      <button className="floatingCommand" onClick={()=>setCommandOpen(true)}>
        <Command size={20}/><span>Portal</span>
      </button>

      {commandOpen && (
        <div className="overlay" onClick={()=>setCommandOpen(false)}>
          <div className="commandPalette" onClick={e=>e.stopPropagation()}>
            <div className="commandInput"><Command size={20}/><input autoFocus placeholder="Build, search, open, deploy..." /></div>
            <p className="eyebrow">SUGGESTED COMMANDS</p>
            {["Build a new app","Open Exotic Portal project","Run platform health check","Create an automation"].map(cmd => (
              <button key={cmd}><span>{cmd}</span><ChevronRight size={17}/></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({title,value,note,kind}) {
  return <div className={`metric ${kind}`}>
    <div className="metricTop"><span>{title}</span><Activity size={17}/></div>
    <strong>{value}</strong><small>{note}</small>
  </div>
}

function ProjectRow({name,status,progress,accent}) {
  return <div className="projectRow">
    <div className={`projectMark ${accent}`}></div>
    <div className="projectInfo"><strong>{name}</strong><span>{status}</span></div>
    <div className="progressWrap"><div className="progress"><i style={{width:`${progress}%`}}></i></div><small>{progress}%</small></div>
    <ChevronRight size={18}/>
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
