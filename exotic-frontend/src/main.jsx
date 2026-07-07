import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Bot,
  CalendarDays,
  CheckCircle2,
  Command,
  Gauge,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  Milestone,
  Search,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import './styles.css';

const seedProjects = [
  {
    id: 'exotic-core',
    name: 'Exotic Core',
    domain: 'Platform',
    phase: 'Frontend Foundation',
    progress: 44,
    health: 91,
    momentum: 76,
    priority: 'Critical',
    accent: 'pink',
    tasks: [
      { id: 1, title: 'Build dashboard shell', status: 'done', owner: 'Architect', points: 5 },
      { id: 2, title: 'Create live progress cards', status: 'active', owner: 'Builder', points: 8 },
      { id: 3, title: 'Wire AI agent activity feed', status: 'active', owner: 'Operator', points: 8 },
      { id: 4, title: 'Add project graph view', status: 'todo', owner: 'Research', points: 13 }
    ],
    milestones: ['Shell', 'Live Progress', 'Command Palette', 'Graph View']
  },
  {
    id: 'memory-engine',
    name: 'Memory Engine',
    domain: 'Intelligence',
    phase: 'Graph Modeling',
    progress: 37,
    health: 84,
    momentum: 69,
    priority: 'High',
    accent: 'blue',
    tasks: [
      { id: 5, title: 'Define Universal State Graph nodes', status: 'done', owner: 'Architect', points: 8 },
      { id: 6, title: 'Design indexing rules', status: 'active', owner: 'Memory', points: 13 },
      { id: 7, title: 'Add snapshot history', status: 'todo', owner: 'Builder', points: 8 }
    ],
    milestones: ['Schema', 'Indexing', 'Snapshots', 'Protection']
  },
  {
    id: 'creator-studio',
    name: 'Creator Studio',
    domain: 'Production',
    phase: 'Workflow Mapping',
    progress: 28,
    health: 79,
    momentum: 62,
    priority: 'Medium',
    accent: 'yellow',
    tasks: [
      { id: 8, title: 'Map idea-to-product workflow', status: 'active', owner: 'Mastermind', points: 8 },
      { id: 9, title: 'Build asset board', status: 'todo', owner: 'Builder', points: 13 },
      { id: 10, title: 'Add publish checklist', status: 'todo', owner: 'Operator', points: 5 }
    ],
    milestones: ['Workflow', 'Assets', 'Publishing', 'Revenue Loop']
  }
];

const agents = [
  { name: 'Architect', role: 'System structure', status: 'mapping modules', load: 84 },
  { name: 'Builder', role: 'Frontend execution', status: 'building UI cards', load: 77 },
  { name: 'Research', role: 'Pattern discovery', status: 'checking project risks', load: 63 },
  { name: 'Operator', role: 'Task flow', status: 'prioritizing next actions', load: 71 },
  { name: 'Security', role: 'Protection layer', status: 'watching permissions', load: 58 }
];

const timeline = [
  { time: 'Now', event: 'Frontend command center active', type: 'live' },
  { time: 'Today', event: 'Project manager shell ready', type: 'build' },
  { time: 'Next', event: 'Connect persistence and local storage', type: 'task' },
  { time: 'Soon', event: 'Add graph explorer + memory browser', type: 'milestone' }
];

function clamp(n) { return Math.max(0, Math.min(100, n)); }

function useLiveProjects() {
  const [projects, setProjects] = useState(seedProjects);
  useEffect(() => {
    const timer = setInterval(() => {
      setProjects(prev => prev.map(project => ({
        ...project,
        progress: clamp(project.progress + (Math.random() > 0.65 ? 1 : 0)),
        health: clamp(project.health + Math.round(Math.random() * 2 - 1)),
        momentum: clamp(project.momentum + Math.round(Math.random() * 4 - 2))
      })));
    }, 1800);
    return () => clearInterval(timer);
  }, []);
  return [projects, setProjects];
}

function App() {
  const [projects, setProjects] = useLiveProjects();
  const [selectedId, setSelectedId] = useState('exotic-core');
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const selected = projects.find(p => p.id === selectedId) || projects[0];
  const allTasks = projects.flatMap(p => p.tasks.map(t => ({ ...t, project: p.name })));
  const overall = Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length);
  const health = Math.round(projects.reduce((sum, p) => sum + p.health, 0) / projects.length);
  const momentum = Math.round(projects.reduce((sum, p) => sum + p.momentum, 0) / projects.length);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter(p => [p.name, p.domain, p.phase, p.priority].join(' ').toLowerCase().includes(q));
  }, [projects, query]);

  function advanceTask(taskId) {
    setProjects(prev => prev.map(project => ({
      ...project,
      tasks: project.tasks.map(task => {
        if (task.id !== taskId) return task;
        const next = task.status === 'todo' ? 'active' : task.status === 'active' ? 'done' : 'done';
        return { ...task, status: next };
      }),
      progress: clamp(project.tasks.some(t => t.id === taskId) ? project.progress + 4 : project.progress)
    })));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar card hard-shadow">
        <div className="brand-mark"><span>EX</span></div>
        <h1>Exotic</h1>
        <p className="muted">Live Project Command Center</p>
        <nav>
          <Nav icon={<LayoutDashboard />} label="Dashboard" active />
          <Nav icon={<ListTodo />} label="Projects" />
          <Nav icon={<Bot />} label="Agents" />
          <Nav icon={<GitBranch />} label="Memory Graph" />
          <Nav icon={<Shield />} label="Security" />
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar card">
          <div>
            <p className="eyebrow">MINGO / EXOTIC SYSTEM</p>
            <h2>Live Progress + Project Management</h2>
          </div>
          <button className="command-button" onClick={() => setPaletteOpen(true)}><Command size={18} /> Command</button>
        </header>

        <section className="metrics-grid">
          <Metric icon={<Gauge />} label="Overall Progress" value={overall} accent="pink" />
          <Metric icon={<Activity />} label="Build Health" value={health} accent="blue" />
          <Metric icon={<Zap />} label="Momentum" value={momentum} accent="yellow" />
          <div className="card live-card"><Sparkles /><strong>LIVE</strong><span>auto-updating prototype</span></div>
        </section>

        <section className="main-grid">
          <div className="card panel-large">
            <div className="panel-head">
              <div><p className="eyebrow">PROJECTS</p><h3>Active Builds</h3></div>
              <div className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects..." /></div>
            </div>
            <div className="project-list">
              {filtered.map(project => <ProjectCard key={project.id} project={project} selected={project.id === selectedId} onClick={() => setSelectedId(project.id)} />)}
            </div>
          </div>

          <div className="card panel">
            <p className="eyebrow">SELECTED PROJECT</p>
            <h3>{selected.name}</h3>
            <p className="muted">{selected.phase} · {selected.domain}</p>
            <ProgressBar value={selected.progress} accent={selected.accent} />
            <div className="mini-grid">
              <Mini label="Health" value={selected.health} />
              <Mini label="Momentum" value={selected.momentum} />
              <Mini label="Priority" value={selected.priority} />
            </div>
            <h4><Milestone size={18} /> Milestones</h4>
            <div className="milestones">{selected.milestones.map((m, i) => <span key={m} className={i === 0 ? 'done' : ''}>{m}</span>)}</div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="card panel-large">
            <div className="panel-head"><div><p className="eyebrow">TASKS</p><h3>Execution Board</h3></div></div>
            <div className="task-columns">
              {['todo', 'active', 'done'].map(status => (
                <div className="task-column" key={status}>
                  <h4>{status}</h4>
                  {allTasks.filter(t => t.status === status).map(task => (
                    <button className="task-card" key={task.id} onClick={() => advanceTask(task.id)}>
                      <strong>{task.title}</strong><span>{task.project} · {task.owner} · {task.points} pts</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="card panel">
            <p className="eyebrow">AGENTS</p><h3>AI Activity</h3>
            <div className="agent-list">{agents.map(a => <Agent key={a.name} agent={a} />)}</div>
          </div>

          <div className="card panel">
            <p className="eyebrow">TIMELINE</p><h3>Build Flow</h3>
            <div className="timeline">{timeline.map(item => <TimelineItem key={item.event} item={item} />)}</div>
          </div>
        </section>
      </main>

      {paletteOpen && <CommandPalette close={() => setPaletteOpen(false)} projects={projects} setSelectedId={setSelectedId} />}
    </div>
  );
}

function Nav({ icon, label, active }) { return <button className={active ? 'nav active' : 'nav'}>{icon}<span>{label}</span></button>; }
function ProgressBar({ value, accent = 'blue' }) { return <div className="progress-track"><div className={`progress-fill ${accent}`} style={{ width: `${value}%` }} /></div>; }
function Metric({ icon, label, value, accent }) { return <div className="metric card"><div className={`metric-icon ${accent}`}>{icon}</div><span>{label}</span><strong>{value}%</strong><ProgressBar value={value} accent={accent} /></div>; }
function Mini({ label, value }) { return <div className="mini"><span>{label}</span><strong>{value}</strong></div>; }
function ProjectCard({ project, selected, onClick }) { return <button className={selected ? 'project-card selected' : 'project-card'} onClick={onClick}><div><strong>{project.name}</strong><span>{project.phase}</span></div><b>{project.progress}%</b><ProgressBar value={project.progress} accent={project.accent} /></button>; }
function Agent({ agent }) { return <div className="agent"><Bot size={18} /><div><strong>{agent.name}</strong><span>{agent.status}</span></div><b>{agent.load}%</b></div>; }
function TimelineItem({ item }) { return <div className="timeline-item"><CheckCircle2 size={18} /><div><strong>{item.time}</strong><span>{item.event}</span></div></div>; }
function CommandPalette({ close, projects, setSelectedId }) { return <div className="overlay" onClick={close}><div className="palette card hard-shadow" onClick={e => e.stopPropagation()}><h3><Command /> Command Palette</h3><p className="muted">Jump to a build.</p>{projects.map(p => <button key={p.id} onClick={() => { setSelectedId(p.id); close(); }}>{p.name}<span>{p.progress}%</span></button>)}</div></div>; }

createRoot(document.getElementById('root')).render(<App />);
