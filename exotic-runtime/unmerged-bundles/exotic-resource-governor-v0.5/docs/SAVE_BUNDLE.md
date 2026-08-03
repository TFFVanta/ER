# EXOTIC Save Bundle — Resource Governor v0.5

**Bundle ID:** `EXOTIC-RESOURCE-GOVERNOR-0.5`

## Status

Architecture, database migration, C++20 implementation, scheduler bridge,
recovery behavior, tests, CLI contract, and integration rules are locked.

## Canonical execution chain

```text
Objective
-> Proposal
-> Governance authority revalidation
-> Hierarchical resource admission
-> Atomic reservation
-> Scheduler execution lease
-> Autonomy operation
-> Verification
-> Actual usage report
-> Reconciliation
-> Reservation release
-> Forecast/anomaly/circuit learning
```

## Locked resource hierarchy

```text
Workspace account
  -> Project account
      -> Agent account
          -> Task account
```

A leaf reservation is checked and charged against every account in its parent
chain. Failure at any parent denies the entire reservation atomically.

## Locked dimensions

- Money in USD
- API credits
- CPU milliseconds
- GPU milliseconds
- Memory bytes
- Storage bytes
- Network bytes
- Concurrency slots

## Semantics

- Money, API, CPU, GPU, network: cumulative consumption
- Storage: persistent capacity until explicitly released
- Memory and concurrency: ephemeral capacity released after execution

## Locked invariants

1. Authority is revalidated before resource admission.
2. Resource admission completes before operation execution.
3. All hierarchy balances and rate tokens commit in one transaction.
4. Failed admission creates no partial reservation or partial token charge.
5. Every active execution owns a durable reservation with an expiration time.
6. Success, failure, timeout, cancellation, and controlled shutdown reconcile
   or release the reservation.
7. Crash-left reservations are released by restart recovery after expiration.
8. Actual consumption is recorded even when execution fails.
9. Concurrency and memory are not accumulated as historical spend.
10. Storage remains allocated until explicitly released.
11. Budget approval is tied to the exact proposal, action, resource scope,
    expiration, simulation mode, and monetary ceiling.
12. Emergency resource stop overrides all accounts and reservations.
13. Idempotency keys prevent duplicate charging.
14. Critical consumption anomalies contribute to circuit opening.
15. Future database schema versions are never silently downgraded.

## Durable tables

- resource_accounts
- resource_account_limits
- resource_rate_limits
- resource_reservations
- resource_reservation_accounts
- resource_reservation_amounts
- resource_usage_reports
- resource_usage_amounts
- resource_circuit_breakers
- resource_anomalies
- resource_ledger_events
- resource_control
- resource_schema_metadata

## Next dependency

`EXOTIC Agent Capability Registry and Work Allocation Runtime v0.6`
