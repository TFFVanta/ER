# Governance Architecture

The Governance Engine applies approval policy to verified autonomous execution sessions.

Primary responsibilities:

- Request governance review for a session after verification.
- Enforce approval policy such as minimum approver count and verification prerequisites.
- Resolve session approval gates through `SessionEngine`.
- Record approval evidence through `VerificationEngine`.
- Emit immutable governance events onto the existing EXOTIC `EventBus`.

Core components:

- `GovernanceEngine`: orchestration facade for review requests, approvals, rejections, escalations, snapshots, and API access.
- `GovernanceEventStream`: event adapter for governance review lifecycle events.
- `GovernanceEngineApi`: read-only facade for governance reviews and metrics.
