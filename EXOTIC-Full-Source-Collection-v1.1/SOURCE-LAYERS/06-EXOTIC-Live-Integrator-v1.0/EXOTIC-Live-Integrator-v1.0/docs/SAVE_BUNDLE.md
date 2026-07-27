# Save Bundle — EXOTIC Live Integration v1.0

**Bundle ID:** `EXOTIC-LIVE-INTEGRATION-1.0`

## Purpose

Safely merge the complete Continuous Operations stack into an existing EXOTIC Windows repository without discarding unrelated local work.

## Locked integration invariants

```text
No unknown local edit is silently overwritten.
Every modified pre-existing file is backed up first.
Any unresolved three-way merge stops before compilation.
All runtime identifiers are allocated atomically and durably.
Sequence allocation reconciles against existing database rows.
A restarted Autonomy Kernel cannot reuse a prior identifier.
Every scheduled operation revalidates authority before resource admission.
Every operation reserves resources before execution.
No completed result is accepted without verification.
The live smoke test must prove all durable records, not merely return success.
```

## Exact runtime chain

```text
Objective
→ Proposal
→ Approval evidence
→ Agent assignment
→ Authority revalidation
→ Resource reservation
→ Scheduled execution
→ Autonomy operation
→ Verification
→ Reconciliation
→ Audit + trace + metrics + dashboard
```

## Rollback policy

Timestamped backups restore every pre-existing file changed by the integrator. Newly created subsystem files are intentionally retained for manual review rather than deleted automatically.

## Definition of Done

The Windows integration is complete only when:

- MSVC Release compilation succeeds.
- All CTest targets pass.
- `exotic runtime status` succeeds through the main dispatcher.
- The isolated simulation report says `result=PASS`.
- All required SQLite records and both dashboard files are verified.
- The service executable exists.
- The install-service command succeeds when run with administrator rights.
