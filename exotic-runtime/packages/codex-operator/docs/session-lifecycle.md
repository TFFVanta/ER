# Session Lifecycle

The Session Engine uses explicit lifecycle states:

- `created`
- `ready`
- `running`
- `waiting_approval`
- `verifying`
- `completed`
- `failed`
- `cancelled`
- `archived`

Typical flow:

1. `create_session(...)` compiles the prompt and persists a `SessionRecord`.
2. If approval is required, the session pauses in `waiting_approval`.
3. `run_session(...)` enqueues tracked assignments and executes them through `WorkerRuntime`.
4. Worker results become `SessionEvidenceRecord` entries.
5. The engine records checkpoints at meaningful lifecycle boundaries.
6. The session transitions to `completed` or `failed`.
7. Optional cancellation or archival keeps history intact without mutating evidence.

Emitted event families:

- `session.created`
- `session.prompt_compiled`
- `session.assignment_queued`
- `session.started`
- `session.approval_requested`
- `session.approval_received`
- `session.evidence_attached`
- `session.verification_started`
- `session.verification_completed`
- `session.completed`
- `session.failed`
- `session.cancelled`
- `session.archived`
