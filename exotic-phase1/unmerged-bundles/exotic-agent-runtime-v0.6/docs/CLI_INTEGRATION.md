# CLI Integration

Route the top-level `agents` command to `run_agent_cli`.

```cpp
if (command == "agents") {
    return exotic::autonomy::agents::run_agent_cli(
        agent_repository,
        agent_registry,
        agent_recovery,
        remaining_arguments,
        std::cout,
        std::cerr
    );
}
```

Commands:

```text
exotic agents status
exotic agents list
exotic agents assignments
exotic agents recover
exotic agents revoke <agent-id> <reason>
```

Expected status:

```text
EXOTIC AGENT RUNTIME 0.6
registered=18
active=15
available=11
unhealthy=1
revoked=2
running_assignments=4
stale_bindings=0
```
