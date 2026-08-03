(() => {
  'use strict';

  const root = document.querySelector('#root');
  const toastRoot = document.querySelector('#toast-root');
  const params = new URLSearchParams(window.location.search);
  const clone = value => structuredClone(value || {});

  const state = {
    view: localStorage.getItem('exotic-view') || 'operations',
    mode: params.get('mode') || localStorage.getItem('exotic-mode') || 'live',
    endpoint: params.get('endpoint') || localStorage.getItem('exotic-endpoint') || 'http://127.0.0.1:8787/api/v1',
    data: clone(window.demoData),
    selectedStepId: null,
    selectedNodeId: null,
    inspectorType: 'roadmap',
    connection: 'connecting',
    loading: true,
    refreshing: false,
    commandOpen: false,
    sleeping: false,
    noteDraft: '',
    noteAuthor: localStorage.getItem('exotic-note-author') || 'operator',
    lastSync: null,
    idleTimeoutMs: Number(localStorage.getItem('exotic-idle-timeout-ms') || 180000),
    lastActivity: Date.now(),
    idleTimer: null,
    pollTimer: null,
    requestController: null
  };

  const views = [
    ['operations', 'Operations', 'grid'],
    ['mind', 'Systems Mind', 'brain'],
    ['roadmap', 'Roadmap', 'roadmap'],
    ['ecosystem', 'Ecosystem', 'network'],
    ['evidence', 'Evidence', 'evidence'],
    ['board', 'Board', 'board'],
    ['bridge', 'Bridge', 'terminal'],
    ['settings', 'Settings', 'settings']
  ];

  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    brain: '<path d="M9 4a3 3 0 0 0-5 2.2A3.2 3.2 0 0 0 5 12a3.2 3.2 0 0 0 4 4.8V4Z"/><path d="M15 4a3 3 0 0 1 5 2.2A3.2 3.2 0 0 1 19 12a3.2 3.2 0 0 1-4 4.8V4Z"/><path d="M9 8H7m2 4H6m9-4h2m-2 4h3"/>',
    roadmap: '<path d="M5 3v18M5 6h10l-2 3 2 3H5M5 15h13l-2 3 2 3H5"/>',
    network: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="m7.3 10.8 9.4-4.6M7.3 13.2l9.4 4.6M19 7.5v9"/>',
    evidence: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>',
    board: '<path d="M4 21V8l8-5 8 5v13M2 21h20M8 21v-7h8v7M8 9h.01M12 9h.01M16 9h.01"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    refresh: '<path d="M20 6v5h-5M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9m16 6-2 2.5A7 7 0 0 1 5.5 15"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    copy: '<rect x="9" y="9" width="11" height="11"/><path d="M5 15H4V4h11v1"/>'
  };

  function icon(name, label = '') {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="${label ? 'false' : 'true'}">${icons[name] || icons.grid}</svg>`;
  }

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value || 0)));
  const bridge = () => state.data.bridge || {};
  const summary = () => state.data.summary || {};
  const roadmap = () => Array.isArray(bridge().roadmap) ? bridge().roadmap : [];
  const repo = () => bridge().repo || {};
  const mind = () => bridge().mind || {};
  const metrics = () => bridge().metrics || {};
  const automation = () => bridge().automation || {};
  const productionFabric = () => bridge().productionFabric || {};
  const ecosystem = () => bridge().ecosystem || {};
  const nodes = () => Array.isArray(ecosystem().nodes) ? ecosystem().nodes : [];
  const links = () => Array.isArray(ecosystem().links) ? ecosystem().links : [];
  const audits = () => Array.isArray(state.data.audit) ? state.data.audit : [];
  const messages = () => Array.isArray(bridge().messages) ? bridge().messages : [];
  const services = () => Array.isArray(bridge().services) ? bridge().services : [];
  const verification = () => bridge().verification || {};
  const board = () => bridge().board || {};

  function activeStep() {
    return roadmap().find(item => item.status === 'running') || roadmap().find(item => item.status === 'pending') || roadmap()[0] || {};
  }

  function selectedStep() {
    const items = roadmap();
    if (!state.selectedStepId || !items.some(item => item.id === state.selectedStepId)) {
      state.selectedStepId = activeStep().id || null;
    }
    return items.find(item => item.id === state.selectedStepId) || activeStep();
  }

  function selectedNode() {
    const allNodes = nodes();
    if (!state.selectedNodeId || !allNodes.some(item => item.id === state.selectedNodeId)) {
      state.selectedNodeId = allNodes[0]?.id || null;
    }
    return allNodes.find(item => item.id === state.selectedNodeId) || allNodes[0] || {};
  }

  function formatClock(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
  }

  function formatDate(value) {
    if (!value) return 'not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function statusTone(status) {
    if (['healthy', 'completed', 'passed', 'running'].includes(status)) return 'good';
    if (['critical', 'failed', 'blocked'].includes(status)) return 'bad';
    return 'neutral';
  }

  function render() {
    selectedStep();
    selectedNode();
    root.innerHTML = shell();
    updateClock();
  }

  function shell() {
    return `
      <div class="app-shell ${state.sleeping ? 'is-sleeping' : ''}">
        ${topbar()}
        <div class="app-body">
          ${iconRail()}
          ${explorerRail()}
          <main class="workspace" id="workspace" tabindex="-1">
            ${state.loading ? loadingState() : renderView()}
          </main>
          ${inspector()}
        </div>
        ${statusbar()}
      </div>
      ${state.commandOpen ? commandPalette() : ''}
      ${state.sleeping ? sleepOverlay() : ''}
    `;
  }

  function topbar() {
    const title = views.find(([id]) => id === state.view)?.[1] || 'Operations';
    return `
      <header class="topbar">
        <button class="brand" data-action="view" data-view="operations" aria-label="Open Operations">
          <img src="./er-logo-reference.png" alt="ER" />
          <strong>EXOTIC</strong>
          <span>OPERATIONS</span>
        </button>
        <div class="topbar__context"><span>${esc(title)}</span><b>/</b><strong>${esc(activeStep().id || 'SYSTEM')}</strong></div>
        <nav class="topbar__commands" aria-label="Workspace commands">
          <button data-action="command">${icon('search')}Command <kbd>Ctrl K</kbd></button>
          <button data-action="view" data-view="bridge">${icon('terminal')}Bridge</button>
          <button data-action="refresh">${icon('refresh')}Refresh</button>
        </nav>
      </header>
    `;
  }

  function iconRail() {
    return `
      <nav class="icon-rail" aria-label="Primary workspace views">
        ${views.map(([id, label, iconName], index) => `
          <button class="icon-rail__button ${state.view === id ? 'is-active' : ''}" data-action="view" data-view="${id}" aria-label="${esc(label)}" title="${esc(label)} (Alt+${index + 1})">
            ${icon(iconName)}<span>${esc(label)}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  function explorerRail() {
    const paths = Array.isArray(repo().changedPathsSample) ? repo().changedPathsSample.slice(0, 8) : [];
    const directoryBreakdown = Array.isArray(repo().directoryBreakdown) ? repo().directoryBreakdown.slice(0, 6) : [];
    return `
      <aside class="explorer">
        <div class="rail-title"><strong>SYSTEM</strong><span>${repo().changedFiles || 0} changed</span></div>
        <div class="tree" aria-label="Repository explorer">
          <div class="tree__root"><span class="tree-caret">v</span><strong>EXOTIC</strong></div>
          <div class="tree__group">
            ${directoryBreakdown.map(item => `<button data-action="view" data-view="evidence"><span class="tree-caret">&gt;</span><span>${esc(item.name)}</span><small>${item.count}</small></button>`).join('') || '<small>No repository areas available.</small>'}
          </div>
          <div class="tree__files">
            ${paths.map(pathname => `<button data-action="copy" data-copy="${esc(pathname)}"><span>#</span><span>${esc(pathname)}</span></button>`).join('')}
          </div>
        </div>
        <div class="explorer__section">
          <strong>SYSTEMS</strong>
          ${views.slice(1, 6).map(([id, label]) => `<button class="${state.view === id ? 'is-active' : ''}" data-action="view" data-view="${id}">${esc(label)}</button>`).join('')}
        </div>
        <div class="explorer__section">
          <strong>OPERATIONS</strong>
          <button data-action="auto-start">Start Auto Mode</button>
          <button data-action="auto-pause">Pause Auto Mode</button>
          <button data-action="view" data-view="bridge">Operator Relay</button>
          <button data-action="view" data-view="settings">Runtime Settings</button>
        </div>
        <div class="explorer__meta">
          <span>BRANCH</span><strong>${esc(repo().branch || 'unknown')}</strong>
        </div>
      </aside>
    `;
  }

  function renderView() {
    return ({
      operations: operationsView,
      mind: mindView,
      roadmap: roadmapView,
      ecosystem: ecosystemView,
      evidence: evidenceView,
      board: boardView,
      bridge: bridgeView,
      settings: settingsView
    }[state.view] || operationsView)();
  }

  function objectiveBar() {
    const step = activeStep();
    const progress = clamp(step.progress);
    const autoRunning = automation().mode === 'running';
    return `
      <section class="objective-bar">
        <div class="objective-bar__title"><span>CURRENT OBJECTIVE</span><strong>${esc(step.id || 'P1-00')} ${esc(step.title || 'No active objective')}</strong></div>
        <div class="objective-bar__progress"><span>PROGRESS</span><div><strong>${progress}%</strong><i><b style="width:${progress}%"></b></i></div></div>
        <div class="objective-bar__control"><span class="execution-cursor"></span><strong>AUTO MODE ${autoRunning ? 'RUNNING' : 'PAUSED'}</strong><button class="button" data-action="${autoRunning ? 'auto-pause' : 'auto-start'}">${icon(autoRunning ? 'pause' : 'play')}${autoRunning ? 'PAUSE' : 'START'}</button></div>
      </section>
    `;
  }

  function operationsView() {
    return `
      <div class="operations-view">
        ${objectiveBar()}
        <div class="operations-upper">
          <section class="module module--mind">${moduleHead('SYSTEMS MIND', 'Readable mind', 'mind')}${mindBody(true)}</section>
          <section class="module module--roadmap">${moduleHead('ROADMAP', `${productionFabric().metrics?.activeCells || 0} ACTIVE / ${productionFabric().metrics?.readyCells || 0} READY`, 'roadmap')}${roadmapTable(8)}</section>
        </div>
        <div class="operations-lower">
          <section class="module">${moduleHead('ECOSYSTEM', `${nodes().length} SYSTEMS`, 'ecosystem')}${ecosystemGraph(nodes().slice(0, 7), true)}</section>
          <section class="module">${moduleHead('BUILD HEALTH', verification().mode || 'unverified', 'evidence')}${healthBody()}</section>
          <section class="module">${moduleHead('EXECUTION LOG', `${audits().length + messages().length} EVENTS`, 'evidence')}${executionLog(12)}</section>
        </div>
      </div>
    `;
  }

  function moduleHead(title, meta, view) {
    return `<header class="module__head"><div><strong>${esc(title)}</strong><span>${esc(meta)}</span></div>${view ? `<button data-action="view" data-view="${view}" aria-label="Open ${esc(title)}">${icon('chevron')}</button>` : ''}</header>`;
  }

  function mindBody(compact = false) {
    const systemMind = mind();
    const checklist = Array.isArray(systemMind.checklist) ? systemMind.checklist : [];
    const constraints = Array.isArray(systemMind.constraints) ? systemMind.constraints : [];
    const thoughts = Array.isArray(systemMind.recentThoughts) ? systemMind.recentThoughts : [];
    return `
      <div class="mind-body ${compact ? 'is-compact' : ''}">
        <div class="mind-primary">
          <div class="mind-block"><span>CURRENT MOVE</span><strong>${esc(systemMind.currentMove || systemMind.objective || 'Waiting for a verified move.')}</strong></div>
          <div class="mind-block"><span>WHY NOW</span><p>${esc(systemMind.whyNow || systemMind.summary || 'No rationale is available.')}</p></div>
          <div class="mind-block mind-prompt"><span>NEXT ALIGNED PROMPT</span><code>${esc(bridge().execution?.prompt || systemMind.expectedOutput || 'Record a bounded execution intent before proceeding.')}</code></div>
          <div class="mind-split">
            <div class="mind-block"><span>CHECKLIST</span>${stringList(checklist, true)}</div>
            <div class="mind-block"><span>CONSTRAINTS</span>${stringList(constraints, false)}</div>
          </div>
        </div>
        <div class="mind-stream">
          <span>EVIDENCE</span>
          ${thoughts.map((item, index) => `<article><i class="${index === 0 ? 'is-live' : ''}"></i><div><strong>${esc(item.label || 'Signal')}</strong><p>${esc(item.detail || '')}</p></div></article>`).join('') || '<small>No thought stream available.</small>'}
        </div>
      </div>
    `;
  }

  function mindView() {
    return `
      <div class="view-stack">
        ${objectiveBar()}
        <section class="module module--fill">${moduleHead('SYSTEMS MIND', 'Operator-readable execution rationale')}${mindBody(false)}</section>
      </div>
    `;
  }

  function roadmapTable(limit = roadmap().length) {
    const items = roadmap().slice(0, limit);
    return `
      <div class="table-wrap">
        <table class="data-table roadmap-table">
          <thead><tr><th>ID</th><th>TASK</th><th>STATUS</th><th>ETA</th><th>EVIDENCE</th></tr></thead>
          <tbody>${items.map(step => `
            <tr class="${selectedStep().id === step.id ? 'is-selected' : ''}" data-action="select-step" data-step-id="${esc(step.id)}">
              <td><code>${esc(step.id)}</code></td><td>${esc(step.title)}</td>
              <td><span class="status status--${statusTone(step.status)}"><i></i>${esc(step.status || 'pending')}</span></td>
              <td>${esc(step.expectedDuration || 'not set')}</td>
              <td>${Number(step.progress || 0) >= 100 ? 'verified' : `${clamp(step.progress)}%`}</td>
            </tr>
          `).join('') || '<tr><td colspan="5">No roadmap steps loaded.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  function roadmapView() {
    const step = selectedStep();
    return `
      <div class="view-stack">
        ${objectiveBar()}
        <section class="module module--fill">
          ${moduleHead('ROADMAP', `${metrics().completedSteps || 0} COMPLETE / ${roadmap().length} TOTAL`)}
          ${productionFabricBody()}
          ${roadmapTable()}
          <footer class="module__footer"><span>SELECTED: ${esc(step.id || 'NONE')}</span><div><button class="button" data-action="start-step" data-step-id="${esc(step.id)}">START</button><button class="button button--solid" data-action="complete-step" data-step-id="${esc(step.id)}">COMPLETE</button></div></footer>
        </section>
      </div>
    `;
  }

  function productionFabricBody() {
    const fabric = productionFabric();
    const layers = Array.isArray(fabric.layers) ? fabric.layers : [];
    if (!layers.length) return '';
    return `
      <div class="production-fabric">
        <header><div><span>PRODUCTION FABRIC</span><strong>${esc(fabric.strategy || 'dependency-layered-swarms')}</strong></div><div><b>${fabric.maxConcurrency || 1}</b><span>MAX CELLS</span></div><div><b>${fabric.metrics?.swarms || 0}</b><span>SWARMS</span></div><div><b>${fabric.verificationBarrier ? 'ON' : 'OFF'}</b><span>EVIDENCE GATE</span></div></header>
        <div class="production-layers">${layers.map(layer => `
          <article class="production-layer production-layer--${statusTone(layer.status)}">
            <span>L${Number(layer.index || 0) + 1}</span>
            <div>${(layer.swarms || []).map(swarm => `<strong title="${esc((swarm.cells || []).map(cell => cell.stepId).join(', '))}">${esc(swarm.lane)}<small>${(swarm.cells || []).length}</small></strong>`).join('')}</div>
          </article>
        `).join('')}</div>
      </div>
    `;
  }

  function ecosystemGraph(graphNodes, compact = false) {
    if (!graphNodes.length) return '<div class="empty">No ecosystem nodes loaded.</div>';
    const width = compact ? 470 : 900;
    const height = compact ? 245 : 520;
    const center = { x: width / 2, y: height / 2 };
    const radiusX = compact ? 165 : 330;
    const radiusY = compact ? 82 : 180;
    const positions = new Map(graphNodes.map((node, index) => {
      if (index === 0) return [node.id, center];
      const angle = ((index - 1) / Math.max(graphNodes.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      return [node.id, { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY }];
    }));
    const visibleLinks = links().filter(link => positions.has(link.from) && positions.has(link.to));
    return `
      <div class="ecosystem-graph ${compact ? 'is-compact' : ''}">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="EXOTIC Ecosystem Map">
          <g class="graph-links">${visibleLinks.map(link => { const from = positions.get(link.from); const to = positions.get(link.to); return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`; }).join('')}</g>
          ${graphNodes.map(node => { const point = positions.get(node.id); const selected = selectedNode().id === node.id; return `<g class="graph-node ${selected ? 'is-selected' : ''}" data-action="select-node" data-node-id="${esc(node.id)}" transform="translate(${point.x} ${point.y})"><rect x="-58" y="-17" width="116" height="34"/><text text-anchor="middle" y="-2">${esc((node.title || node.id).slice(0, 18))}</text><text class="graph-node__progress" text-anchor="middle" y="11">${clamp(node.progress)}%</text></g>`; }).join('')}
        </svg>
      </div>
    `;
  }

  function ecosystemView() {
    const sections = Array.isArray(ecosystem().sections) ? ecosystem().sections : [];
    return `
      <div class="ecosystem-view">
        <section class="module ecosystem-canvas">${moduleHead('EXOTIC ECOSYSTEM MAP', `${nodes().length} CONNECTED PARTS`)}${ecosystemGraph(nodes(), false)}</section>
        <section class="module ecosystem-list">${moduleHead('SYSTEM INDEX', `${sections.length} LAYERS`)}<div class="node-index">${nodes().map(node => `<button class="${selectedNode().id === node.id ? 'is-selected' : ''}" data-action="select-node" data-node-id="${esc(node.id)}"><span>${esc(node.section || 'System')}</span><strong>${esc(node.title)}</strong><i><b style="width:${clamp(node.progress)}%"></b></i><small>${clamp(node.progress)}%</small></button>`).join('')}</div></section>
      </div>
    `;
  }

  function healthBody() {
    const verified = verification();
    const build = verified.build || {};
    const test = verified.test || {};
    const progressValues = roadmap().map(item => clamp(item.progress));
    return `
      <div class="health-body">
        <div class="gate-strip">
          <div><strong>${build.passed ?? '-'} / ${build.total ?? '-'}</strong><span>BUILD</span></div>
          <div><strong>${test.passed ?? '-'} / ${test.total ?? '-'}</strong><span>TEST</span></div>
          <div><strong>${verified.totalTasks ?? '-'}</strong><span>GATES</span></div>
        </div>
        ${sparkline(progressValues)}
        <div class="health-meta"><div><span>MODE</span><strong>${esc(verified.mode || 'not recorded')}</strong></div><div><span>VERIFIED</span><strong>${formatDate(verified.verifiedAt)}</strong></div><div><span>SERVICES</span><strong>${services().filter(item => statusTone(item.status) === 'good').length}/${services().length}</strong></div><div><span>REPO SIGNAL</span><strong>${summary().health || 0}%</strong></div></div>
      </div>
    `;
  }

  function sparkline(values) {
    const width = 420;
    const height = 115;
    const normalized = values.length ? values : [0];
    const points = normalized.map((value, index) => `${10 + (index * (width - 20) / Math.max(normalized.length - 1, 1))},${height - 10 - clamp(value) * (height - 20) / 100}`).join(' ');
    return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Roadmap progress distribution"><path d="M10 10H410M10 57H410M10 105H410"/><polyline points="${points}"/><text x="10" y="20">100%</text><text x="10" y="100">0%</text></svg>`;
  }

  function executionLog(limit = 30) {
    const merged = [
      ...audits().map(item => ({ time: item.time, type: item.event, message: item.message, timestamp: item.timestamp || item.time })),
      ...messages().map(item => ({ time: formatClock(new Date(item.timestamp)), type: item.kind, message: item.message, timestamp: item.timestamp }))
    ].sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || ''))).slice(0, limit);
    return `<div class="execution-log">${merged.map((item, index) => `<article><time>${esc(item.time || '--:--:--')}</time><i class="${index === 0 ? 'is-running' : ''}">${index === 0 ? '>' : '+'}</i><div><strong>${esc(item.type || 'event')}</strong><p>${esc(item.message || '')}</p></div></article>`).join('') || '<div class="empty">No execution evidence available.</div>'}</div>`;
  }

  function evidenceView() {
    return `
      <div class="evidence-view">
        <section class="module evidence-log">${moduleHead('EXECUTION ACTIVITY', 'Execution Activity')}${executionLog(100)}</section>
        <section class="module evidence-health">${moduleHead('VERIFICATION', 'Evidence-backed state')}${healthBody()}<div class="service-matrix">${services().map(service => `<article><span class="status-dot status-dot--${statusTone(service.status)}"></span><div><strong>${esc(service.label)}</strong><p>${esc(service.detail)}</p></div><small>${esc(service.status)}</small></article>`).join('')}</div></section>
      </div>
    `;
  }

  function boardView() {
    const members = Array.isArray(board().members) ? board().members : [];
    const agenda = Array.isArray(board().agenda) ? board().agenda : [];
    const decisions = Array.isArray(board().decisions) ? board().decisions : [];
    return `
      <div class="board-view">
        <section class="module board-summary">${moduleHead('BOARD OF DIRECTORS', board().cadence || 'Governance')}<p>${esc(board().summary || 'Governance and operating oversight for EXOTIC.')}</p><div><span>NEXT REVIEW</span><strong>${esc(board().nextReview || 'not scheduled')}</strong></div></section>
        <section class="module">${moduleHead('SEATS', `${members.length} MEMBERS`)}<div class="board-list">${members.map(item => `<article><span>${esc(item.role)}</span><strong>${esc(item.name)}</strong><p>${esc(item.summary)}</p></article>`).join('')}</div></section>
        <section class="module">${moduleHead('AGENDA', `${agenda.length} ITEMS`)}<div class="board-list">${agenda.map(item => `<article><span>${esc(item.timing)}</span><strong>${esc(item.title)}</strong><p>${esc(item.summary)}</p></article>`).join('')}</div></section>
        <section class="module board-decisions">${moduleHead('DECISION DOMAINS', `${decisions.length} CONTROLS`)}<div class="board-list">${decisions.map(item => `<article><span>${esc(item.domain)}</span><strong>${esc(item.scope)}</strong>${stringList(item.triggers || [], false)}</article>`).join('')}</div></section>
      </div>
    `;
  }

  function bridgeView() {
    const communication = bridge().communication || {};
    return `
      <div class="bridge-view">
        <section class="module relay-compose">${moduleHead('OPERATOR BRIDGE', 'Connected to Codex project')}<form data-form="bridge"><label>AUTHOR<input id="bridge-author" value="${esc(state.noteAuthor)}" autocomplete="name" /></label><label>MESSAGE<textarea id="bridge-message" rows="8" placeholder="State the decision, correction, or next constraint.">${esc(state.noteDraft)}</textarea></label><div class="form-actions"><span>Messages become durable execution evidence.</span><button class="button button--solid" type="submit">SEND TO BRIDGE</button></div></form></section>
        <section class="module relay-state">${moduleHead('RELAY STATE', `${messages().length} RECENT MESSAGES`)}<div class="path-list">${Object.entries(communication).filter(([, value]) => typeof value === 'string' && /[\\/]/.test(value)).map(([key, value]) => `<button data-action="copy" data-copy="${esc(value)}"><span>${esc(key)}</span><code>${esc(value)}</code>${icon('copy')}</button>`).join('')}</div><div class="message-list">${messages().map(item => `<article><header><strong>${esc(item.author)}</strong><time>${formatDate(item.timestamp)}</time></header><span>${esc(item.kind)}</span><p>${esc(item.message)}</p></article>`).join('') || '<div class="empty">No bridge messages recorded.</div>'}</div></section>
      </div>
    `;
  }

  function settingsView() {
    return `
      <section class="module settings-view">
        ${moduleHead('SETTINGS', 'Observer and runtime configuration')}
        <form data-form="settings">
          <label>DATA MODE<select id="setting-mode"><option value="live" ${state.mode === 'live' ? 'selected' : ''}>Live</option><option value="demo" ${state.mode === 'demo' ? 'selected' : ''}>Demo</option></select><small>Live is the professional operating default.</small></label>
          <label>BRIDGE ENDPOINT<input id="setting-endpoint" value="${esc(state.endpoint)}" spellcheck="false" /><small>Expected default: http://127.0.0.1:8787/api/v1</small></label>
          <label>IDLE SLEEP MINUTES<input id="setting-idle" type="number" min="1" max="120" value="${Math.round(state.idleTimeoutMs / 60000)}" /><small>The bouncing ER screensaver does not stop auto mode.</small></label>
          <div class="form-actions"><span>Changes are stored locally on this workstation.</span><button class="button button--solid" type="submit">SAVE SETTINGS</button></div>
        </form>
      </section>
    `;
  }

  function inspector() {
    return state.inspectorType === 'ecosystem' ? nodeInspector(selectedNode()) : stepInspector(selectedStep());
  }

  function stepInspector(step) {
    const communication = bridge().communication || {};
    return `
      <aside class="inspector">
        <div class="rail-title"><strong>INSPECTOR</strong><span>CONTEXT</span></div>
        <section class="inspector__section"><span>SELECTION</span><dl><dt>ID</dt><dd>${esc(step.id || 'none')}</dd><dt>TASK</dt><dd>${esc(step.title || 'No step selected')}</dd><dt>STATUS</dt><dd>${esc(step.status || 'unknown')}</dd><dt>OWNER</dt><dd>${esc(step.owner || 'unassigned')}</dd></dl></section>
        <section class="inspector__section"><span>DETAILS</span><dl><dt>PRIORITY</dt><dd>${esc(step.priority || 'not set')}</dd><dt>LANE</dt><dd>${esc(step.lane || 'roadmap')}</dd><dt>DEPENDS ON</dt><dd>${esc((step.dependsOn || []).join(', ') || 'none')}</dd><dt>PROGRESS</dt><dd>${clamp(step.progress)}%</dd><dt>EST. EFFORT</dt><dd>${esc(step.expectedDuration || 'not set')}</dd><dt>UPDATED</dt><dd>${formatDate(bridge().focus?.updatedAt)}</dd></dl><p>${esc(step.summary || '')}</p></section>
        <section class="inspector__section"><span>EVIDENCE LINKS</span><div class="inspector-links">${['roadmapFile', 'workspaceFile', 'verificationFile', 'masterPlanFile'].filter(key => communication[key]).map(key => `<button data-action="copy" data-copy="${esc(communication[key])}"><span>${esc(key)}</span>${icon('copy')}</button>`).join('')}</div></section>
        <section class="inspector__section inspector__actions"><span>ACTIONS</span><button data-action="start-step" data-step-id="${esc(step.id)}">${icon('play')}Start task</button><button data-action="complete-step" data-step-id="${esc(step.id)}">${icon('evidence')}Complete task</button><button data-action="view" data-view="bridge">${icon('terminal')}Add note</button><button data-action="refresh">${icon('refresh')}Refresh state</button></section>
      </aside>
    `;
  }

  function nodeInspector(node) {
    return `
      <aside class="inspector">
        <div class="rail-title"><strong>INSPECTOR</strong><span>ECOSYSTEM</span></div>
        <section class="inspector__section"><span>SELECTION</span><dl><dt>ID</dt><dd>${esc(node.id || 'none')}</dd><dt>SYSTEM</dt><dd>${esc(node.title || 'No node selected')}</dd><dt>LAYER</dt><dd>${esc(node.section || 'unknown')}</dd><dt>PROGRESS</dt><dd>${clamp(node.progress)}%</dd></dl></section>
        <section class="inspector__section"><span>DEFINITION</span><p>${esc(node.definition || '')}</p></section>
        <section class="inspector__section"><span>COMPLETE</span><p>${esc(node.completed || 'No completion evidence recorded.')}</p></section>
        <section class="inspector__section"><span>NEEDS</span><p>${esc(node.needed || 'No remaining work recorded.')}</p></section>
        <section class="inspector__section inspector__actions"><span>ACTIONS</span><button data-action="view" data-view="roadmap">${icon('roadmap')}Open roadmap</button><button data-action="view" data-view="bridge">${icon('terminal')}Add directive</button></section>
      </aside>
    `;
  }

  function statusbar() {
    const autoMode = automation().mode || 'unknown';
    return `
      <footer class="statusbar">
        <div><span class="connection connection--${state.connection}"></span><strong>${state.connection.toUpperCase()}</strong><span>${esc(state.endpoint.replace('/api/v1', ''))}</span></div>
        <div><strong>AUTO MODE ${esc(autoMode.toUpperCase())}</strong><span class="equalizer">${Array.from({ length: 12 }, (_, index) => `<i style="--i:${index}"></i>`).join('')}</span></div>
        <div class="statusbar__metrics"><span>HEALTH <strong>${summary().health || 0}%</strong></span><span>CHANGED <strong>${repo().changedFiles || 0}</strong></span><span>UNTRACKED <strong>${repo().untrackedFiles || 0}</strong></span><time id="runtime-clock">${formatClock()}</time></div>
      </footer>
    `;
  }

  function commandPalette() {
    return `
      <div class="command-overlay" data-action="command-close">
        <section class="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
          <header>${icon('search')}<input id="command-search" placeholder="Type a workspace command" autocomplete="off" /><button data-action="command-close">${icon('close')}</button></header>
          <div>${views.map(([id, label, iconName], index) => `<button data-action="view" data-view="${id}">${icon(iconName)}<span>Open ${esc(label)}</span><kbd>Alt ${index + 1}</kbd></button>`).join('')}<button data-action="refresh">${icon('refresh')}<span>Refresh live state</span><kbd>R</kbd></button><button data-action="${automation().mode === 'running' ? 'auto-pause' : 'auto-start'}">${icon(automation().mode === 'running' ? 'pause' : 'play')}<span>${automation().mode === 'running' ? 'Pause' : 'Start'} Auto Mode</span><kbd>Space</kbd></button></div>
        </section>
      </div>
    `;
  }

  function loadingState() {
    return `<div class="loading-state"><img src="./er-logo-reference.png" alt="ER"/><strong>ALIGNING OPERATIONS</strong><span>Reading state / checking evidence / preparing workspace</span><i></i></div>`;
  }

  function sleepOverlay() {
    return `<div class="sleep-screen" data-action="wake"><img src="./er-logo-reference.png" alt="ER screensaver"/><div><strong>EXOTIC IS OPERATING</strong><span>Move or press any key to resume the workspace.</span></div></div>`;
  }

  function stringList(items, checked) {
    if (!items.length) return '<small>No entries recorded.</small>';
    return `<ul>${items.map(item => `<li><i>${checked ? '[ ]' : '-'}</i><span>${esc(item)}</span></li>`).join('')}</ul>`;
  }

  function toast(message, tone = 'neutral') {
    if (!toastRoot) return;
    const element = document.createElement('div');
    element.className = `toast toast--${tone}`;
    element.textContent = message;
    toastRoot.appendChild(element);
    setTimeout(() => element.remove(), 3600);
  }

  function setView(view) {
    if (!views.some(([id]) => id === view)) return;
    state.view = view;
    state.commandOpen = false;
    localStorage.setItem('exotic-view', view);
    render();
    document.querySelector('#workspace')?.focus({ preventScroll: true });
  }

  async function fetchJson(pathname, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 7000);
    try {
      const response = await fetch(`${state.endpoint}${pathname}`, {
        ...options,
        headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function refresh({ silent = false } = {}) {
    if (state.refreshing) return;
    if (state.mode === 'demo') {
      state.data = clone(window.demoData);
      state.connection = 'demo';
      state.loading = false;
      render();
      return;
    }
    state.refreshing = true;
    if (!silent) render();
    try {
      const payload = await fetchJson('/console/snapshot');
      state.data = payload;
      state.connection = 'online';
      state.lastSync = new Date();
    } catch (error) {
      state.connection = 'offline';
      if (!silent) toast(`Bridge unavailable: ${error.name === 'AbortError' ? 'request timed out' : error.message}`, 'bad');
    } finally {
      state.refreshing = false;
      state.loading = false;
      render();
    }
  }

  async function mutate(pathname, body, successMessage) {
    if (state.mode !== 'live') {
      toast('Switch to Live mode to execute this action.', 'bad');
      return;
    }
    try {
      await fetchJson(pathname, { method: 'POST', body: JSON.stringify(body), timeout: 9000 });
      toast(successMessage, 'good');
      await refresh({ silent: true });
    } catch (error) {
      toast(`Action failed: ${error.name === 'AbortError' ? 'request timed out' : error.message}`, 'bad');
    }
  }

  function handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'view') return setView(target.dataset.view);
    if (action === 'refresh') return refresh();
    if (action === 'command') { state.commandOpen = !state.commandOpen; render(); requestAnimationFrame(() => document.querySelector('#command-search')?.focus()); return; }
    if (action === 'command-close') { if (event.target === target || target.closest('button')) { state.commandOpen = false; render(); } return; }
    if (action === 'select-step') { state.selectedStepId = target.dataset.stepId; state.inspectorType = 'roadmap'; render(); return; }
    if (action === 'select-node') { state.selectedNodeId = target.dataset.nodeId; state.inspectorType = 'ecosystem'; render(); return; }
    if (action === 'auto-start') return mutate('/bridge/auto-mode', { mode: 'running' }, 'Auto mode started.');
    if (action === 'auto-pause') return mutate('/bridge/auto-mode', { mode: 'paused' }, 'Auto mode paused.');
    if (action === 'start-step') return mutate('/bridge/roadmap', { id: target.dataset.stepId, status: 'running' }, `${target.dataset.stepId} started.`);
    if (action === 'complete-step') return mutate('/bridge/roadmap', { id: target.dataset.stepId, status: 'completed' }, `${target.dataset.stepId} completed.`);
    if (action === 'copy') return navigator.clipboard?.writeText(target.dataset.copy || '').then(() => toast('Path copied.', 'good')).catch(() => toast('Copy unavailable.', 'bad'));
    if (action === 'wake') return wake();
  }

  function handleInput(event) {
    if (event.target.id === 'bridge-message') state.noteDraft = event.target.value;
    if (event.target.id === 'bridge-author') state.noteAuthor = event.target.value;
  }

  function handleSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === 'bridge') {
      const message = state.noteDraft.trim();
      if (!message) return toast('Write a bridge message first.', 'bad');
      localStorage.setItem('exotic-note-author', state.noteAuthor.trim() || 'operator');
      mutate('/bridge/message', { author: state.noteAuthor.trim() || 'operator', kind: 'operator-note', message }, 'Bridge message recorded.').then(() => { state.noteDraft = ''; });
      return;
    }
    if (form.dataset.form === 'settings') {
      state.mode = document.querySelector('#setting-mode')?.value || state.mode;
      state.endpoint = document.querySelector('#setting-endpoint')?.value.trim() || state.endpoint;
      state.idleTimeoutMs = clamp(document.querySelector('#setting-idle')?.value, 1, 120) * 60000;
      localStorage.setItem('exotic-mode', state.mode);
      localStorage.setItem('exotic-endpoint', state.endpoint);
      localStorage.setItem('exotic-idle-timeout-ms', String(state.idleTimeoutMs));
      scheduleIdle();
      toast('Settings saved.', 'good');
      state.loading = true;
      refresh();
    }
  }

  function handleKeydown(event) {
    registerActivity(true);
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      state.commandOpen = !state.commandOpen;
      render();
      requestAnimationFrame(() => document.querySelector('#command-search')?.focus());
      return;
    }
    if (event.key === 'Escape' && state.commandOpen) { state.commandOpen = false; render(); return; }
    if (event.altKey && /^[1-8]$/.test(event.key)) { event.preventDefault(); setView(views[Number(event.key) - 1][0]); return; }
    if (event.target.matches('input, textarea, select')) return;
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); refresh(); }
    if (event.code === 'Space') { event.preventDefault(); mutate('/bridge/auto-mode', { mode: automation().mode === 'running' ? 'paused' : 'running' }, 'Auto mode state changed.'); }
  }

  function registerActivity(force = false) {
    const now = Date.now();
    if (!force && now - state.lastActivity < 1000) return;
    state.lastActivity = now;
    if (state.sleeping) wake();
    scheduleIdle();
  }

  function scheduleIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(() => {
      if (Date.now() - state.lastActivity >= state.idleTimeoutMs) {
        state.sleeping = true;
        render();
      } else scheduleIdle();
    }, Math.max(1000, state.idleTimeoutMs - (Date.now() - state.lastActivity)));
  }

  function wake() {
    state.sleeping = false;
    state.lastActivity = Date.now();
    scheduleIdle();
    render();
  }

  function updateClock() {
    const clock = document.querySelector('#runtime-clock');
    if (clock) clock.textContent = formatClock();
  }

  function startLoops() {
    setInterval(updateClock, 1000);
    state.pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && state.mode === 'live' && !state.sleeping) refresh({ silent: true });
    }, 15000);
    scheduleIdle();
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('submit', handleSubmit);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('pointermove', () => registerActivity(false), { passive: true });
  window.addEventListener('pointerdown', () => registerActivity(true), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.mode === 'live') refresh({ silent: true });
  });

  render();
  startLoops();
  refresh();
})();
