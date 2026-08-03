# Verification Architecture

The Verification Engine validates completed execution sessions using deterministic rules and structured evidence.

Primary responsibilities:

- Derive verification requests from `SessionRecord` state and session constraints.
- Record structured evidence artifacts from tests, builds, documentation, reviews, and worker output.
- Evaluate required rules without mutating prior session history.
- Emit immutable verification events onto the existing EXOTIC `EventBus`.
- Export verification metrics for downstream governance and operations.

Core components:

- `VerificationEngine`: orchestration facade for requests, evidence recording, verification, snapshots, and API access.
- `EvidenceStore`: in-memory structured artifact store keyed by session identifier.
- `VerificationEventStream`: event adapter for verification request, evidence, and result events.
- `VerificationEngineApi`: read-only facade for verification requests, results, evidence, and metrics.
