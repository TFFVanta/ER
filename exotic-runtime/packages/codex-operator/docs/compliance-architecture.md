# Compliance Architecture

The Compliance Engine records immutable audit trails and evaluates compliance policies over autonomous execution sessions.

Primary responsibilities:

- Register reusable compliance policies.
- Record audit records without mutating prior governance, verification, or automation results.
- Evaluate compliance across session, verification, governance, policy automation, and audit state.
- Emit immutable compliance and audit events onto the existing EXOTIC `EventBus`.
- Export compliance metrics for downstream observability and forensics.

Core components:

- `ComplianceEngine`: orchestration facade for compliance policy registration, audit recording, reporting, snapshots, and API access.
- `AuditStore`: in-memory immutable audit trail storage keyed by session identifier.
- `AuditEventStream`: event adapter for audit and compliance lifecycle events.
- `ComplianceEngineApi`: read-only facade for policies, reports, audit records, and metrics.
