# EXOTIC Save Bundle — Event Scheduler and Durable Runtime v0.3

**Bundle ID:** `EXOTIC-EVENT-RUNTIME-0.3`

## Locked architecture

- Persistent SQLite event queue and job store.
- Immediate, scheduled, fixed-interval recurring, event-triggered, and conditional jobs.
- Jobs carry Objective and Proposal identifiers.
- Execution is only allowed through `AutonomyExecutionBridge`, preserving Objective → Proposal → Decision Gate → Operation → Verification.
- Unique idempotency keys prevent duplicate job creation and duplicate event ingestion.
- Priority ordering is deterministic: priority descending, due time ascending, ID ascending.
- Dependency gating supports all-completed, all-successful, any-completed, and any-successful policies.
- Worker leases are exclusive per job and survive process restarts.
- Workers heartbeat active leases; expired leases are recovered into retry state.
- Global and named-group concurrency limits are enforced before lease acquisition.
- Execution deadlines and scheduler shutdown request cooperative cancellation.
- Transient failures and timeouts use capped exponential backoff with optional jitter.
- Permanent, policy, cancellation, verification, and exhausted retry failures enter the dead-letter queue.
- Recurring jobs reset their attempt count after successful verified execution.
- Clean shutdown uses `std::jthread` and stop tokens.

## Runtime invariants

1. A job cannot be actively leased by two workers.
2. A completed idempotency key cannot create another job accidentally.
3. Scheduler execution cannot bypass the Autonomy Decision Gate.
4. A crash cannot convert an unverified operation into success.
5. Expired leases are recoverable and auditable.
6. Retry delay is bounded by policy.
7. Dependency failures do not silently count as success.
8. Dead letters preserve original payload, attempt count, and failure class.

## Definition of Done

- [x] Persistent event queue
- [x] Scheduled jobs
- [x] Recurring jobs
- [x] Conditional triggers
- [x] Event triggers
- [x] Dependencies
- [x] Leasing and heartbeats
- [x] Timeouts
- [x] Exponential backoff
- [x] Dead-letter storage
- [x] Idempotency keys
- [x] Priority scheduling
- [x] Concurrency controls
- [x] Clean shutdown
- [x] Restart recovery
- [x] Autonomy bridge
- [x] Tests
- [x] CMake integration
- [x] CLI status/list commands

## Next dependency

`EXOTIC Approval, Governance, and Authority Runtime v0.4`
