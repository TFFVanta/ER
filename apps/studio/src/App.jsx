import { useMemo, useState } from "react";
import erLogo from "../../../exotic-operations-console-v1.0/public/er-logo-reference.png";
import "./App.css";
import {
  buildWorkspaceModel,
  entityTitle,
  entityTypeLabels,
  relatedEntities,
} from "./workspace-model.js";
import { bridgeBaseUrl, refreshIntervalMs, useWorkspace } from "./use-workspace.js";

const views = [
  { id: "menu", label: "Menu", code: "00" },
  { id: "workbench", label: "Workbench", code: "01" },
  { id: "graph", label: "Graph", code: "02" },
  { id: "evidence", label: "Evidence", code: "03" },
  { id: "operations", label: "Operations", code: "04" },
  { id: "progress", label: "Progress", code: "05" },
  { id: "test", label: "Test", code: "06" },
  { id: "settings", label: "Settings", code: "07" },
];

function statusLabel(status) {
  return (status || "unknown").replaceAll("-", " ");
}

function entityIdentifier(type, record) {
  const fields = {
    venture: "ventureId",
    objective: "objectiveId",
    "studio-scope": "studioScopeId",
    workflow: "workflowId",
    task: "taskId",
    artifact: "artifactId",
    "evidence-record": "evidenceId",
    decision: "decisionId",
    approval: "approvalId",
    resource: "resourceId",
    metric: "metricId",
    "memory-record": "memoryId",
  };
  return record?.[fields[type]];
}

export default function App() {
  const workspaceState = useWorkspace();
  const [activeStudioId, setActiveStudioId] = useState("ideas");
  const [activeView, setActiveView] = useState("menu");
  const [selectedId, setSelectedId] = useState("");
  const [actionState, setActionState] = useState({ busy: false, message: "" });

  const modelResult = useMemo(() => {
    if (!workspaceState.workspace) return { model: null, error: "" };
    try {
      return {
        model: buildWorkspaceModel(workspaceState.workspace),
        error: "",
      };
    } catch (error) {
      return {
        model: null,
        error:
          error instanceof Error
            ? error.message
            : "Workspace validation failed.",
      };
    }
  }, [workspaceState.workspace]);

  const model = modelResult.model;
  const activeStudio =
    model?.studios.find((studio) => studio.id === activeStudioId) ?? null;
  const defaultEntityId =
    activeStudio?.scope?.studioScopeId || model?.venture.ventureId || "";
  const selectedEntity =
    model?.entityIndex.get(selectedId || defaultEntityId) ?? null;
  const linkedEntities = relatedEntities(model, selectedEntity?.id);
  const autoMode = workspaceState.bridge?.automation?.mode || "offline";

  function selectStudio(studioId) {
    const studio = model?.studios.find((item) => item.id === studioId);
    setActiveStudioId(studioId);
    setSelectedId(studio?.scope?.studioScopeId || "");
    setActiveView("workbench");
  }

  async function runAction(action) {
    setActionState({ busy: true, message: "" });
    try {
      const message = await action();
      setActionState({ busy: false, message: message || "Action completed." });
    } catch (error) {
      setActionState({
        busy: false,
        message: error instanceof Error ? error.message : "Action failed.",
      });
    }
  }

  if (workspaceState.loading && !model) {
    return <LoadingScreen />;
  }

  if (!model) {
    return (
      <OfflineScreen
        error={modelResult.error || workspaceState.error}
        onRetry={workspaceState.refresh}
      />
    );
  }

  return (
    <main className="shell">
      <header className="command-bar">
        <button
          className="brand"
          type="button"
          onClick={() => setActiveView("menu")}
        >
          <img src={erLogo} alt="EXOTIC ER" />
          <span>
            <strong>EXOTIC</strong>
            <small>VENTURE WORKSPACE</small>
          </span>
        </button>

        <div className="venture-context">
          <span className={`status-dot status-${model.venture.status}`} />
          <span>
            <small>ACTIVE VENTURE</small>
            <strong>{model.venture.name}</strong>
          </span>
          <code>{model.workspace.schemaVersion}</code>
        </div>

        <div className="command-actions">
          <button
            type="button"
            onClick={() => runAction(workspaceState.refresh)}
          >
            REFRESH
          </button>
          <button
            className={autoMode === "running" ? "mode-running" : ""}
            type="button"
            disabled={actionState.busy}
            onClick={() =>
              runAction(async () => {
                const nextMode = autoMode === "running" ? "paused" : "running";
                await workspaceState.setAutoMode(nextMode);
                return `Auto mode ${nextMode}.`;
              })
            }
          >
            <i /> {autoMode === "running" ? "PAUSE AUTO" : "START AUTO"}
          </button>
        </div>
      </header>

      <aside className="studio-rail" aria-label="Studios">
        <div className="rail-label">
          STUDIOS <span>{model.studios.length}</span>
        </div>
        <nav>
          {model.studios.map((studio) => (
            <button
              key={studio.id}
              type="button"
              className={studio.id === activeStudioId ? "active" : ""}
              onClick={() => selectStudio(studio.id)}
              aria-current={studio.id === activeStudioId ? "page" : undefined}
            >
              <b>{studio.code}</b>
              <span>{studio.label}</span>
              <i className={`status-dot status-${studio.status}`} />
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <span>GRAPH</span>
          <strong>{model.summary.graphEdges}</strong>
          <small>CONNECTED EDGES</small>
        </div>
      </aside>

      <section className="workspace">
        <nav className="view-tabs" aria-label="Workspace views">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              className={activeView === view.id ? "active" : ""}
              onClick={() => setActiveView(view.id)}
            >
              <span>{view.code}</span> {view.label}
            </button>
          ))}
          <div className="sync-state">
            <i
              className={
                workspaceState.error ? "status-error" : "status-active"
              }
            />
            {workspaceState.error ? "SYNC DEGRADED" : "LIVE BRIDGE"}
          </div>
        </nav>

        {activeView === "menu" ? (
          <MainMenu
            model={model}
            bridge={workspaceState.bridge}
            onNavigate={setActiveView}
          />
        ) : null}
        {activeView === "workbench" ? (
          <Workbench
            studio={activeStudio}
            selectedId={selectedEntity?.id}
            onSelect={setSelectedId}
          />
        ) : null}
        {activeView === "graph" ? (
          <GraphView
            model={model}
            activeStudioId={activeStudioId}
            onSelectStudio={selectStudio}
          />
        ) : null}
        {activeView === "evidence" ? (
          <EvidenceView workspace={model.workspace} onSelect={setSelectedId} />
        ) : null}
        {activeView === "operations" ? (
          <OperationsView bridge={workspaceState.bridge} model={model} />
        ) : null}
        {activeView === "progress" ? (
          <ProgressView model={model} bridge={workspaceState.bridge} />
        ) : null}
        {activeView === "test" ? (
          <TestView bridge={workspaceState.bridge} />
        ) : null}
        {activeView === "settings" ? (
          <SettingsView
            bridge={workspaceState.bridge}
            autoMode={autoMode}
            busy={actionState.busy}
            error={workspaceState.error}
            updatedAt={workspaceState.updatedAt}
            onToggleAutoMode={() =>
              runAction(async () => {
                const nextMode = autoMode === "running" ? "paused" : "running";
                await workspaceState.setAutoMode(nextMode);
                return `Auto mode ${nextMode}.`;
              })
            }
            onRefresh={() => runAction(workspaceState.refresh)}
          />
        ) : null}
      </section>

      <aside className="inspector">
        <div className="inspector-head">
          <span>INSPECTOR</span>
          <strong>
            {(entityTypeLabels[selectedEntity?.type] || "Venture").toUpperCase()}
          </strong>
        </div>
        <div className="inspector-body">
          <p className="eyebrow">SELECTED OBJECT</p>
          <h2>{entityTitle(selectedEntity)}</h2>
          <StatusBadge status={selectedEntity?.record?.status || "active"} />

          <dl>
            <div>
              <dt>OWNER</dt>
              <dd>
                {selectedEntity?.record?.owner ||
                  selectedEntity?.record?.operator ||
                  "system"}
              </dd>
            </div>
            <div>
              <dt>UPDATED</dt>
              <dd>
                {formatTime(
                  selectedEntity?.record?.updatedAt ||
                    model.workspace.generatedAt,
                )}
              </dd>
            </div>
            <div>
              <dt>LINKS</dt>
              <dd>{linkedEntities.length}</dd>
            </div>
            <div>
              <dt>EVIDENCE</dt>
              <dd>
                {
                  model.workspace.evidenceRecords.filter(
                    (item) => item.relatedEntityId === selectedEntity?.id,
                  ).length
                }
              </dd>
            </div>
          </dl>

          {selectedEntity?.record?.summary ? (
            <p className="object-summary">{selectedEntity.record.summary}</p>
          ) : null}
          {selectedEntity?.record?.completionCriteria?.length ? (
            <section className="criteria">
              <h3>COMPLETION CRITERIA</h3>
              {selectedEntity.record.completionCriteria.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </section>
          ) : null}

          <section className="linked-list">
            <h3>CONNECTED OBJECTS</h3>
            {linkedEntities.slice(0, 5).map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => setSelectedId(entity.id)}
              >
                <span>{entityTypeLabels[entity.type] || entity.type}</span>
                <strong>{entityTitle(entity)}</strong>
              </button>
            ))}
            {!linkedEntities.length ? <p>No direct graph links.</p> : null}
          </section>
        </div>
        <div className="inspector-actions">
          <button
            type="button"
            onClick={() =>
              runAction(async () => {
                await navigator.clipboard.writeText(
                  selectedEntity?.id || model.venture.ventureId,
                );
                return "Entity ID copied.";
              })
            }
          >
            COPY ID
          </button>
          <button
            type="button"
            disabled={!selectedEntity || actionState.busy}
            onClick={() =>
              runAction(async () => {
                await workspaceState.queueReview(selectedEntity);
                return "Review request recorded in the bridge.";
              })
            }
          >
            QUEUE REVIEW
          </button>
          <button
            type="button"
            onClick={() => window.open(bridgeBaseUrl, "_blank", "noopener")}
          >
            OPEN OPS
          </button>
        </div>
        {actionState.message ? (
          <div className="action-message">{actionState.message}</div>
        ) : null}
      </aside>

      <footer className="status-bar">
        <span>
          VENTURE <strong>{model.venture.ventureId}</strong>
        </span>
        <span>
          OUTPUTS <strong>{model.summary.outputCoverage}/13</strong>
        </span>
        <span>
          VERIFIED <strong>{model.summary.verifiedEvidence}</strong>
        </span>
        <span className="status-spacer" />
        <span>
          {workspaceState.updatedAt
            ? `SYNC ${formatTime(workspaceState.updatedAt)}`
            : "NOT SYNCED"}
        </span>
      </footer>
    </main>
  );
}

function Workbench({ studio, selectedId, onSelect }) {
  if (!studio?.scope) {
    return (
      <EmptyState
        title="Studio unavailable"
        detail="This workspace has no canonical scope for the selected studio."
      />
    );
  }

  return (
    <div className="workbench">
      <header className="workspace-head">
        <div>
          <p className="eyebrow">{studio.code} / SHARED STUDIO SCOPE</p>
          <h1>{studio.label}</h1>
          <p>
            {studio.objectives[0]?.summary || "No objective has been attached."}
          </p>
        </div>
        <div className="studio-score">
          <span>COMPLETE</span>
          <strong>{studio.progress}%</strong>
          <small>
            {studio.activeCount} active / {studio.blockedCount} blocked
          </small>
        </div>
      </header>

      <section className="objective-strip">
        <span>OBJECTIVES</span>
        {studio.objectives.map((objective) => (
          <button
            key={objective.objectiveId}
            type="button"
            onClick={() => onSelect(objective.objectiveId)}
          >
            <i className={`priority-${objective.priority}`} />
            <strong>{objective.title}</strong>
            <small>{objective.priority}</small>
          </button>
        ))}
      </section>

      <div className="work-grid">
        <EntityColumn
          title="Execution Queue"
          count={studio.tasks.length}
          records={studio.tasks}
          type="task"
          selectedId={selectedId}
          onSelect={onSelect}
          empty="No graph-linked tasks."
        />
        <EntityColumn
          title="Editable Outputs"
          count={studio.artifacts.length}
          records={studio.artifacts}
          type="artifact"
          selectedId={selectedId}
          onSelect={onSelect}
          empty="No graph-linked artifacts."
        />
      </div>
    </div>
  );
}

function EntityColumn({
  title,
  count,
  records,
  type,
  selectedId,
  onSelect,
  empty,
}) {
  return (
    <section className="entity-column">
      <header>
        <span>{title}</span>
        <strong>{String(count).padStart(2, "0")}</strong>
      </header>
      <div className="entity-list">
        {records.map((record) => {
          const id = entityIdentifier(type, record);
          return (
            <button
              key={id}
              type="button"
              className={selectedId === id ? "selected" : ""}
              onClick={() => onSelect(id)}
            >
              <span className={`entity-index status-${record.status}`}>
                {type === "task" ? "T" : "A"}
              </span>
              <span className="entity-copy">
                <strong>{record.title}</strong>
                <small>
                  {type === "task"
                    ? statusLabel(record.actionType)
                    : `${statusLabel(record.artifactType)} / ${record.version}`}
                </small>
              </span>
              <StatusBadge status={record.status} />
            </button>
          );
        })}
        {!records.length ? <p className="empty-row">{empty}</p> : null}
      </div>
    </section>
  );
}

function GraphView({ model, activeStudioId, onSelectStudio }) {
  return (
    <div className="graph-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">CANONICAL VENTURE GRAPH</p>
          <h1>Connected system map</h1>
          <p>Every studio reads and writes the same venture context.</p>
        </div>
        <div className="studio-score">
          <span>EDGES</span>
          <strong>{model.edges.length}</strong>
          <small>{model.entityIndex.size} objects</small>
        </div>
      </header>
      <div className="graph-canvas">
        <div className="venture-node">
          <small>VENTURE ROOT</small>
          <strong>{model.venture.name}</strong>
          <span>{model.venture.status}</span>
        </div>
        <div className="connector">
          <span>SHARED OBJECTIVE / MEMORY / AUTHORITY FABRIC</span>
        </div>
        <div className="studio-node-grid">
          {model.studios.map((studio) => (
            <button
              key={studio.id}
              type="button"
              className={studio.id === activeStudioId ? "active" : ""}
              onClick={() => onSelectStudio(studio.id)}
            >
              <b>{studio.code}</b>
              <span>
                <strong>{studio.label}</strong>
                <small>
                  {studio.tasks.length} tasks / {studio.artifacts.length}{" "}
                  outputs
                </small>
              </span>
              <i className={`status-dot status-${studio.status}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceView({ workspace, onSelect }) {
  return (
    <div className="ledger-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">TRUST LAYER</p>
          <h1>Evidence and authority</h1>
          <p>Completion, decisions, and approvals remain inspectable.</p>
        </div>
      </header>
      <div className="ledger-grid">
        <Ledger
          title="Evidence Records"
          records={workspace.evidenceRecords}
          idField="evidenceId"
          onSelect={onSelect}
          secondary={(item) => `${item.evidenceType} / ${item.verdict}`}
        />
        <Ledger
          title="Decisions"
          records={workspace.decisions}
          idField="decisionId"
          onSelect={onSelect}
          secondary={(item) =>
            item.approvalRequired ? "approval required" : "within authority"
          }
        />
        <Ledger
          title="Approvals"
          records={workspace.approvals}
          idField="approvalId"
          onSelect={onSelect}
          secondary={(item) => `${item.requiredByRole} / ${item.status}`}
        />
      </div>
    </div>
  );
}

function Ledger({ title, records, idField, onSelect, secondary }) {
  return (
    <section className="ledger">
      <header>
        <span>{title}</span>
        <strong>{records.length}</strong>
      </header>
      {records.map((item) => (
        <button
          key={item[idField]}
          type="button"
          onClick={() => onSelect(item[idField])}
        >
          <strong>{item.title || item.source || item[idField]}</strong>
          <small>{secondary(item)}</small>
        </button>
      ))}
      {!records.length ? <p>No records.</p> : null}
    </section>
  );
}

function OperationsView({ bridge, model }) {
  const roadmap = bridge?.roadmap || [];
  return (
    <div className="operations-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">OPERATIONS / SAME WORKSPACE</p>
          <h1>{bridge?.focus?.title || "Operations relay"}</h1>
          <p>
            {bridge?.focus?.nextStep ||
              "The operations bridge is not reporting a next step."}
          </p>
        </div>
        <div className="studio-score">
          <span>AUTO MODE</span>
          <strong className="mode-text">
            {bridge?.automation?.mode || "offline"}
          </strong>
          <small>{bridge?.verification?.status || "unverified"}</small>
        </div>
      </header>
      <div className="metric-grid">
        <Metric label="Active work" value={model.summary.activeWork} />
        <Metric label="Blocked" value={model.summary.blockedWork} />
        <Metric label="Verified" value={model.summary.verifiedEvidence} />
        <Metric label="Outputs" value={`${model.summary.outputCoverage}/13`} />
      </div>
      <section className="roadmap-table">
        <header>
          <span>BUILD ROADMAP</span>
          <strong>{roadmap.length} STEPS</strong>
        </header>
        {roadmap.map((step) => (
          <div
            key={step.id}
            className={step.status === "running" ? "running" : ""}
          >
            <code>{step.id}</code>
            <span>
              <strong>{step.title}</strong>
              <small>{step.status}</small>
            </span>
            <progress max="100" value={step.progress || 0} />
            <b>{step.progress || 0}%</b>
          </div>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MainMenu({ model, bridge, onNavigate }) {
  const cards = [
    {
      id: "workbench",
      code: "01",
      title: "Workbench",
      detail: "Studio objectives, tasks, and editable outputs.",
      stat: `${model.studios.length} studios`,
    },
    {
      id: "graph",
      code: "02",
      title: "Graph",
      detail: "The connected venture system map.",
      stat: `${model.summary.graphEdges} edges`,
    },
    {
      id: "evidence",
      code: "03",
      title: "Evidence",
      detail: "Evidence records, decisions, and approvals.",
      stat: `${model.summary.verifiedEvidence} verified`,
    },
    {
      id: "operations",
      code: "04",
      title: "Operations",
      detail: "Auto mode, execution intent, and the build roadmap.",
      stat: bridge?.automation?.mode || "offline",
    },
    {
      id: "progress",
      code: "05",
      title: "Progress",
      detail: "Overall completion across studios and roadmap steps.",
      stat: `${bridge?.metrics?.overallProgress ?? 0}% complete`,
    },
    {
      id: "test",
      code: "06",
      title: "Test",
      detail: "Last verification run: build, test, and console checks.",
      stat: bridge?.verification?.status || "unverified",
    },
    {
      id: "settings",
      code: "07",
      title: "Settings",
      detail: "Bridge connection, repository, and automation state.",
      stat: bridge ? "connected" : "offline",
    },
  ];

  return (
    <div className="main-menu">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">MAIN MENU</p>
          <h1>{model.venture.name}</h1>
          <p>Navigate to any section of the venture workspace.</p>
        </div>
      </header>
      <div className="menu-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="menu-card"
            onClick={() => onNavigate(card.id)}
          >
            <b>{card.code}</b>
            <span className="menu-card-copy">
              <strong>{card.title}</strong>
              <small>{card.detail}</small>
            </span>
            <em>{card.stat}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressView({ model, bridge }) {
  const metrics = bridge?.metrics;
  const roadmap = bridge?.roadmap || [];
  return (
    <div className="progress-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">COMPLETION STATE</p>
          <h1>Progress</h1>
          <p>How far each studio and roadmap step has advanced.</p>
        </div>
        <div className="studio-score">
          <span>OVERALL</span>
          <strong>{metrics?.overallProgress ?? 0}%</strong>
          <small>{metrics?.health || "unknown"}</small>
        </div>
      </header>
      <div className="metric-grid">
        <Metric label="Overall" value={`${metrics?.overallProgress ?? 0}%`} />
        <Metric label="Completed" value={metrics?.completedSteps ?? 0} />
        <Metric label="Running" value={metrics?.runningSteps ?? 0} />
        <Metric label="Pending" value={metrics?.pendingSteps ?? 0} />
      </div>
      <section className="studio-progress-list">
        <header>
          <span>STUDIO COMPLETION</span>
          <strong>{model.studios.length}</strong>
        </header>
        {model.studios.map((studio) => (
          <div key={studio.id} className="studio-progress-row">
            <b>{studio.code}</b>
            <span className="studio-progress-copy">
              <strong>{studio.label}</strong>
              <small>
                {studio.activeCount} active / {studio.blockedCount} blocked
              </small>
            </span>
            <progress max="100" value={studio.progress} />
            <em>{studio.progress}%</em>
          </div>
        ))}
      </section>
      <section className="roadmap-table">
        <header>
          <span>BUILD ROADMAP</span>
          <strong>{roadmap.length} STEPS</strong>
        </header>
        {roadmap.map((step) => (
          <div
            key={step.id}
            className={step.status === "running" ? "running" : ""}
          >
            <code>{step.id}</code>
            <span>
              <strong>{step.title}</strong>
              <small>{step.status}</small>
            </span>
            <progress max="100" value={step.progress || 0} />
            <b>{step.progress || 0}%</b>
          </div>
        ))}
        {!roadmap.length ? <p className="empty-row">No roadmap steps loaded.</p> : null}
      </section>
    </div>
  );
}

function TestView({ bridge }) {
  const verification = bridge?.verification;

  if (!verification) {
    return (
      <div className="test-view">
        <header className="workspace-head compact">
          <div>
            <p className="eyebrow">VERIFICATION</p>
            <h1>Test</h1>
            <p>No verification run has been recorded yet.</p>
          </div>
        </header>
        <EmptyState
          title="No verification evidence"
          detail="Run npm run verify from the workspace root to produce a verification record."
        />
      </div>
    );
  }

  const buildFailures = verification.build?.failures || [];
  const testFailures = verification.test?.failures || [];

  return (
    <div className="test-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">VERIFICATION</p>
          <h1>Test</h1>
          <p>Last recorded result of {verification.command || "the verification command"}.</p>
        </div>
        <div className="studio-score">
          <span>STATUS</span>
          <strong className="mode-text">{verification.status}</strong>
          <small>{formatTime(verification.verifiedAt)}</small>
        </div>
      </header>
      <div className="metric-grid">
        <Metric
          label="Build"
          value={`${verification.build?.passed ?? 0}/${verification.build?.total ?? 0}`}
        />
        <Metric
          label="Test"
          value={`${verification.test?.passed ?? 0}/${verification.test?.total ?? 0}`}
        />
        <Metric label="Total tasks" value={verification.totalTasks ?? 0} />
        <Metric
          label="Console runtime"
          value={verification.console?.isolatedRuntime || "unknown"}
        />
      </div>
      <section className="test-failures">
        <header>
          <span>BUILD FAILURES</span>
          <strong>{buildFailures.length}</strong>
        </header>
        {buildFailures.map((failure, index) => (
          <p key={index}>{typeof failure === "string" ? failure : JSON.stringify(failure)}</p>
        ))}
        {!buildFailures.length ? <p className="empty-row">No build failures.</p> : null}
      </section>
      <section className="test-failures">
        <header>
          <span>TEST FAILURES</span>
          <strong>{testFailures.length}</strong>
        </header>
        {testFailures.map((failure, index) => (
          <p key={index}>{typeof failure === "string" ? failure : JSON.stringify(failure)}</p>
        ))}
        {!testFailures.length ? <p className="empty-row">No test failures.</p> : null}
      </section>
    </div>
  );
}

function SettingsView({
  bridge,
  autoMode,
  busy,
  error,
  updatedAt,
  onToggleAutoMode,
  onRefresh,
}) {
  const repo = bridge?.repo;
  return (
    <div className="settings-view">
      <header className="workspace-head compact">
        <div>
          <p className="eyebrow">SYSTEM</p>
          <h1>Settings</h1>
          <p>Bridge connection, automation, and repository state.</p>
        </div>
      </header>
      <div className="settings-grid">
        <section className="settings-section">
          <header>
            <span>CONNECTION</span>
          </header>
          <div className="settings-row">
            <dt>Bridge URL</dt>
            <dd>{bridgeBaseUrl}</dd>
          </div>
          <div className="settings-row">
            <dt>Sync</dt>
            <dd>{error ? "degraded" : "live"}</dd>
          </div>
          <div className="settings-row">
            <dt>Last synced</dt>
            <dd>{updatedAt ? formatTime(updatedAt) : "not synced"}</dd>
          </div>
          <div className="settings-row">
            <dt>Refresh interval</dt>
            <dd>{Math.round(refreshIntervalMs / 1000)}s</dd>
          </div>
          <div className="settings-actions">
            <button type="button" disabled={busy} onClick={onRefresh}>
              REFRESH NOW
            </button>
          </div>
        </section>

        <section className="settings-section">
          <header>
            <span>AUTOMATION</span>
          </header>
          <div className="settings-row">
            <dt>Auto mode</dt>
            <dd>{autoMode}</dd>
          </div>
          <div className="settings-row">
            <dt>Detail</dt>
            <dd>{bridge?.automation?.detail || "unknown"}</dd>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className={autoMode === "running" ? "mode-running" : ""}
              disabled={busy}
              onClick={onToggleAutoMode}
            >
              {autoMode === "running" ? "PAUSE AUTO" : "START AUTO"}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <header>
            <span>REPOSITORY</span>
          </header>
          <div className="settings-row">
            <dt>Workspace</dt>
            <dd>{repo?.workspace || "unknown"}</dd>
          </div>
          <div className="settings-row">
            <dt>Branch</dt>
            <dd>{repo?.branch || "unknown"}</dd>
          </div>
          <div className="settings-row">
            <dt>Changed files</dt>
            <dd>{repo?.changedFiles ?? 0}</dd>
          </div>
          <div className="settings-row">
            <dt>Untracked files</dt>
            <dd>{repo?.untrackedFiles ?? 0}</dd>
          </div>
          {repo?.summary ? <p className="settings-note">{repo.summary}</p> : null}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <i />
      {statusLabel(status)}
    </span>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <img src={erLogo} alt="EXOTIC ER" />
      <span>ALIGNING VENTURE WORKSPACE</span>
      <div>
        <i />
        <i />
        <i />
      </div>
    </main>
  );
}

function OfflineScreen({ error, onRetry }) {
  return (
    <main className="offline-screen">
      <img src={erLogo} alt="EXOTIC ER" />
      <p className="eyebrow">WORKSPACE BRIDGE</p>
      <h1>EXOTIC is not connected.</h1>
      <p>
        {error ||
          "Start the operations bridge to load the canonical venture workspace."}
      </p>
      <code>npm --prefix exotic-operations-console-v1.0 run codex:live</code>
      <button type="button" onClick={onRetry}>
        RETRY CONNECTION
      </button>
    </main>
  );
}

function formatTime(value) {
  if (!value) return "unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
