# EXOTIC Save Bundle — Approval, Governance, and Authority Runtime v0.4
Bundle ID: EXOTIC-GOVERNANCE-0.4
Status: implementation bundle locked.

Canonical chain:
Proposal → Authority Revalidation → Durable Approval/Policy Decision → Scheduler Lease → Operation → Verification.

Locked invariants:
- Scheduler execution never bypasses current authority.
- Requesters cannot approve their own requests.
- Quorum counts unique approvers; optional multi-signature counts distinct roles.
- High-risk work escalates.
- Grants are scoped by action, resource type, autonomy, budget, validity, and revocation.
- Emergency stop overrides every grant and approval.
- Approval decisions expire and can be revoked.
- Evidence is append-only and hash chained.
- Simulation-only authorization never mutates the external world.
- Policy versions are durable and independently activatable.

Next dependency: EXOTIC Resource Governor and Budget Runtime v0.5.
