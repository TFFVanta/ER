# EXOTIC Save Bundle — Agent Capability Registry and Work Allocation v0.6

Bundle ID: `EXOTIC-AGENT-RUNTIME-0.6`

## Locked execution position

```text
Proposal and governance planning
  -> Agent selection and team formation
  -> Selected-agent authority revalidation
  -> Aggregate resource reservation
  -> Scheduler execution
  -> Verification
  -> Performance learning
```

## Locked invariants

1. An agent identity is durable and independently revocable.
2. A display name is never used as an authority identity.
3. Capability claims require explicit proficiency and reliability values.
4. Tool access is evaluated separately from capability scoring.
5. A candidate must satisfy current health, liveness, trust, domain, governance,
   tool, workload, cost, and resource constraints.
6. A team must collectively cover every required capability.
7. Supervisor requirements are explicit and independently validated.
8. Agent selection is revalidated immediately before execution.
9. A resource reservation covers the aggregate selected-team estimate.
10. One durable assignment owns the job continuity key.
11. Replacement increments assignment version instead of creating a disconnected
    operation.
12. Worker bindings expire unless heartbeats renew them.
13. Restart recovery never reports interrupted work as completed.
14. Performance history updates capability reliability and proficiency gradually.
15. Revoked, stale, unhealthy, or unauthorized agents cannot remain selectable.

## Selection score

```text
Total =
  capability fit
+ reliability
+ trust fit
+ availability
+ health
+ workload capacity
+ cost fit
+ domain fit
```

Hard constraints are evaluated before weighted scoring. A high score cannot
bypass a denied tool permission, insufficient trust, governance denial, resource
incompatibility, unhealthy state, or missing required capability coverage.

## Durable records

- Agent identities
- Specialist profiles
- Runtime and model metadata
- Roles and attributes
- Domain scopes
- Capability taxonomy
- Agent capabilities
- Tool permissions
- Capability evidence
- Work assignments and versions
- Team membership
- Supervisors
- Parallel and sequential stages
- Worker bindings and heartbeats
- Performance history
- Learning updates

## Recovery invariant

```text
Expired worker binding
  -> binding released
  -> assignment interrupted
  -> failed identity excluded
  -> replacement attempted
  -> same assignment ID and continuity key retained
```

## Next dependency

`EXOTIC Continuous Operations Runtime v1.0`
