# Session Architecture

The Session Engine is the orchestration layer between planning and execution inside `packages/codex-operator`.

Primary responsibilities:

- Compile a deterministic prompt for a concrete objective.
- Materialize a tracked execution session with stable identifiers.
- Coordinate worker execution through `WorkerRuntime`.
- Track approvals, evidence, checkpoints, and final outcomes.
- Publish immutable lifecycle events through the existing EXOTIC `EventBus`.

Core components:

- `SessionEngine`: facade for session creation, execution, approvals, evidence, cancellation, archival, and snapshots.
- `SessionStore`: in-memory authoritative session state store.
- `SessionEventStream`: adapter that publishes structured session events into EXOTIC's existing event infrastructure.
- `SessionEngineApi`: read-only API facade for sessions, checkpoints, and session metrics.

Composition model:

1. `PromptCompiler` compiles a reproducible prompt.
2. `SessionEngine` persists a `SessionRecord` with prompt metadata and planned assignments.
3. `WorkerRuntime` receives assignments only when execution starts.
4. Worker results are folded back into session evidence and checkpoints.
5. Session metrics and health-relevant counts are exported through `MetricsCollector`.
