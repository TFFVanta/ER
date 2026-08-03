Replace direct use of `AutonomyExecutionBridge` with:

```cpp
AutonomyExecutionBridge autonomy{kernel, "exotic.worker"};
GovernanceService governance{governance_repository};
AuthorityGate gate{governance};
Subject worker{"exotic.worker", {"operator"}, {{"environment","production"}}};
GovernedExecutionBridge governed{gate, autonomy, worker, 25.0, false};
DurableScheduler scheduler{scheduler_repository, governed, conditions, limits};
```

The governed bridge revalidates grants, policies, autonomy level, budget, risk,
approval state, simulation mode, and emergency-stop state immediately before every job.
