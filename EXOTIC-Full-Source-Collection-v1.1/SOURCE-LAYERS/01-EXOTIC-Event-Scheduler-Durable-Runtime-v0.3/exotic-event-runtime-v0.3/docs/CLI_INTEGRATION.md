# CLI integration

Create the repository beside the existing Autonomy v0.2 repository, using the same database file:

```cpp
SqliteAutonomyRepository autonomy_repository{database_path};
AutonomyKernel kernel{autonomy_repository};
SqliteSchedulerRepository scheduler_repository{database_path};
BasicConditionEvaluator condition_evaluator;
AutonomyExecutionBridge execution_bridge{kernel, "exotic.scheduler"};
DurableScheduler scheduler{scheduler_repository, execution_bridge, condition_evaluator};
```

Route commands:

```cpp
if (command == "scheduler") {
    std::vector<std::string_view> scheduler_args(args.begin() + 2, args.end());
    return run_scheduler_cli(scheduler_repository, scheduler_args);
}
```

Recommended commands:

```text
exotic scheduler status
exotic scheduler jobs
exotic scheduler dead-letters
exotic scheduler run --workers 4
exotic scheduler recover
exotic scheduler cancel <job-id>
exotic scheduler retry <dead-letter-id>
```

The included CLI implements the first three read-only commands. The runtime methods expose start, stop, recover, submit, publish, and cancel for the application shell.
