# Observability Architecture

The Observability and Forensics Engine extends the Codex Operator with immutable operational telemetry, incident tracking, timeline compilation, and forensic report generation.

Primary responsibilities:

- Record structured observability signals without mutating prior execution state.
- Open, update, and close incidents tied to autonomous execution sessions.
- Compile deterministic timelines by reading session, verification, governance, policy automation, compliance, and local observability state.
- Generate forensic reports that summarize anomalies, evidence references, and incident relationships.
- Emit immutable observability events onto the existing EXOTIC `EventBus`.

Core components:

- `ObservabilityEngine`: orchestration facade for signal recording, incident lifecycle management, timeline compilation, report generation, snapshots, and API access.
- `SignalStore`: in-memory immutable storage for structured observability signals keyed by session identifier.
- `ObservabilityEventStream`: event adapter for observability and forensics lifecycle events.
- `ObservabilityEngineApi`: read-only facade for signals, incidents, reports, and metrics.

Integration points:

- `SessionEngine` provides execution lifecycle events and checkpoints.
- `VerificationEngine` provides evidence identifiers and verification failures.
- `GovernanceEngine` provides approval decisions and escalations.
- `PolicyAutomationEngine` provides automated decision outcomes.
- `ComplianceEngine` provides audit-backed compliance results.
- `MetricsCollector` exports aggregate observability and forensics counters for downstream reporting.
