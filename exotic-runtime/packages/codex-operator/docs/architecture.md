# Architecture

`packages/codex-operator` is a thin orchestration layer on top of existing EXOTIC systems.

Core integration points:

- `exotic::Runtime` provides the runtime kernel, event bus, memory store, security, and universal graph runtime access.
- `exotic::runtime::ServiceGraph` provides dependency validation and startup ordering.
- `exotic::runtime::RuntimeConfig` provides the upstream runtime configuration contract.

Foundation modules:

- Configuration store: loads operator settings and overlays runtime-derived defaults.
- Structured logger: emits structured logs to memory and optional JSONL files.
- Metrics collector: tracks startup time, memory usage, active services, active workers, event throughput, error count, and build statistics.
- Health monitor: aggregates readiness and health across registered services.
- Dependency container: stores runtime-owned and operator-owned dependencies without global state.
- Lifecycle manager: validates dependency graphs, recovers services, starts them in dependency order, and shuts them down in reverse order.
- Plugin registry: installs package extensions into the same service and dependency graph.
- Event bridge: subscribes to the existing EXOTIC event bus and turns activity into logs and metrics.
- Prompt compiler: analyzes repository state, selects canon and context, applies constraints, renders deterministic prompts, and validates them before emission.
- Worker runtime: registers workers dynamically, dispatches assignments via the event bus, manages retries and dead letters, and exposes runtime state through an API layer.
- Session engine: owns end-to-end execution sessions, bridges prompt compilation to worker execution, captures approvals and evidence, records checkpoints, and emits immutable session lifecycle events.
- Verification engine: evaluates completed sessions against deterministic evidence and policy rules, records structured artifacts, and emits immutable verification events.
- Governance engine: applies approval policies to verified sessions, records governance decisions, resolves approval gates, and emits immutable governance review events.
- Policy automation engine: evaluates reusable automation rules over governance and verification state, then delegates automatic approval, rejection, or escalation actions.
- Compliance engine: records immutable audit trails, evaluates compliance policies over existing runtime decisions, and emits compliance/audit events without mutating prior evidence.
- Observability engine: records structured execution signals, tracks incidents, compiles deterministic timelines from prior engine state, and emits forensic reports for operator review.

The package deliberately favors composition. The facade owns collaborating modules rather than embedding lifecycle logic inside service implementations.
