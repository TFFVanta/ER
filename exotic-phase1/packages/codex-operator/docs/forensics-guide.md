# Forensics Guide

Typical flow:

1. Create a session through `SessionEngine`.
2. Record verification evidence, governance decisions, policy automation outcomes, and compliance audits as usual.
3. Record targeted `ObservabilitySignal` entries for anomalies, budget pressure, queue depth, or worker health changes.
4. Open incidents when a signal requires operator follow-up.
5. Call `compile_timeline(session_id)` to build a deterministic cross-engine event sequence.
6. Call `generate_report(session_id)` to produce a reusable forensic artifact.
7. Archive the report after handoff or retention processing.

Recommended signal categories:

- Worker pressure and queue depth
- Retry and recovery actions
- Verification regressions
- Compliance drift
- Governance escalations
- Resource budget overruns

Recommended incident workflow:

- Open incidents with referenced signal identifiers and subsystem tags.
- Update incidents as mitigation progresses.
- Close incidents only after the report captures the final outcome.
