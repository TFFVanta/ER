# EXOTIC Save Bundle — Continuous Operations Runtime v1.0

Bundle ID: `EXOTIC-CONTINUOUS-OPERATIONS-1.0`

Status: integration architecture and compile-oriented implementation locked; Windows release certification pending.

## Locked architecture

```text
Observe
→ Understand
→ Decide
→ Govern
→ Allocate
→ Reserve
→ Execute
→ Verify
→ Reconcile
→ Learn
```

## Canonical runtime composition

```text
Autonomy Kernel v0.1
+ Persistence v0.2
+ Event Scheduler v0.3
+ Governance v0.4
+ Resource Governor v0.5
+ Agent Runtime v0.6
= Continuous Operations Runtime v1.0
```

## Locked service order

```text
Autonomy
→ Governance
→ Resources
→ Agents
→ Agent Heartbeat
→ Scheduler
→ Health Supervisor
```

Recovery precedes startup. Shutdown occurs in reverse dependency order.

## Locked invariants

- There is one scheduler execution bridge: `AgentOrchestratedExecutionBridge`.
- Authority and resources are revalidated immediately before operation execution.
- Dynamic assignment identity reaches the Autonomy Kernel audit record.
- Every operation has a durable objective, proposal, assignment, authority decision, resource reservation, execution record, and verification outcome.
- Recovery always runs before service start.
- A workspace has one active runtime owner.
- Startup cycles and missing dependencies are rejected.
- Partial startup failure rolls back already-started services.
- Shutdown is cooperative and reverse ordered.
- Emergency stop overrides normal authority and resource admission.
- Simulation mode cannot mutate external systems.
- Telemetry and control state are durable and workspace scoped.
- A crash cannot convert unverified work into completed work.
- A completed scheduler job cannot be executed again by a stale worker copy.
- A shared SQLite connection cannot host overlapping transactions.
- Repository IDs use durable atomic sequences rather than `MAX(id)+1`.
- Agent replacement changes assignment version, not operation identity.
- Learning may update proficiency and reliability but cannot grant tools, authority, trust, or scope.

## Durable operational surfaces

- System-wide audit timeline
- End-to-end trace records
- Metrics and counters
- Active and historical alerts
- Service health records
- Cross-process control requests
- JSON and text dashboard snapshots
- Scheduler jobs and leases
- Governance evidence
- Resource reservations and usage reports
- Agent assignments, bindings, and performance history

## Emergency behavior

```text
Emergency request
→ durable control record
→ governance emergency stop
→ resource emergency stop
→ scheduler admission blocked
→ audit and alert evidence
```

Emergency clearing is explicit and audited; it is never inferred from restart.

## Compatibility decisions discovered during integration

1. SQLite statement and transaction ownership is serialized at the v0.2 connection layer.
2. Scheduler terminal state is persisted before lease release.
3. Scheduler workers reload and revalidate jobs after acquiring a lease.
4. Governance grants enforce capability scope.
5. Scheduler, governance, resource, agent, telemetry, and Autonomy repositories use durable sequences.
6. The Autonomy execution actor is resolved from the current durable agent assignment.

## Validation record

- Full bootstrap translation unit compiled.
- Standalone runtime control CLI compiled and opened durable state.
- GNU C++20 warning-as-error build passed.
- Nine tests passed.
- The concurrency test completed 100 jobs with four workers and no duplicate execution, stuck leases, or failed assertions.

## Release gate

v1.0 becomes release-certified only after:

- Live repository merge
- Actual v0.1/v0.2 MSVC compilation
- Root CLI dispatcher wiring
- All CTest targets pass on Windows
- Simulation-mode end-to-end operation passes
- Windows service install/start/stop/uninstall passes
- 24-hour soak has no stuck lease, reservation, assignment, missing audit sequence, or unbounded memory growth

## Next execution phase

The next phase is not another architecture subsystem. It is live-repository integration, Windows validation, simulation commissioning, and release hardening.
