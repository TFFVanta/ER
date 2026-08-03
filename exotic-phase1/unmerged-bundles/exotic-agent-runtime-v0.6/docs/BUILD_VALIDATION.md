# Build Validation

The v0.6 translation units were compiled in a Linux C++20 compatibility harness
with:

```text
-Wall -Wextra -Wpedantic -Werror
```

The harness used the concrete interfaces from the supplied v0.3 scheduler,
v0.4 governance, and v0.5 resource bundles.

A full CMake compatibility harness configured, built, and ran nine CTest targets.
All nine passed:

```text
exotic.agents.registry
exotic.agents.routing
exotic.agents.team
exotic.agents.replacement
exotic.agents.learning
exotic.agents.recovery
exotic.agents.sqlite
exotic.agents.scheduler_bridge
exotic.agents.governance
```

These cover tool permissions, load balancing, multi-specialist teams, supervisor
assignment, continuity-preserving replacement, learning, restart recovery,
SQLite reconstruction, scheduler execution context, resource reconciliation,
and durable governance approval compatibility.

The inherited v0.3 `scheduler/types.cpp` emits misleading-indentation warnings
under GCC because several conditionals share one line. The v0.6 source itself
passes `-Werror`. MSVC integration must still be run inside the live EXOTIC root
because its exact v0.2 target and command dispatcher were not available here.
