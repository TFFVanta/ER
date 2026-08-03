# `.exotic/runtime.conf`
```ini
runtime.mode=simulation
runtime.workspace_id=exotic-main
runtime.seed_simulation_identity=true
runtime.shutdown_grace_ms=30000
scheduler.workers=4
health.interval_ms=1000
control.interval_ms=250
agents.heartbeat_interval_ms=5000
dashboard.enabled=true
budget.money_usd=100
budget.api_credits=10000
budget.cpu_ms=3600000
budget.concurrency=4
budget.default_job_usd=10
```
Production mode never auto-seeds authority. Simulation mode may seed one local simulation identity when explicitly enabled. Persisted state cannot expand production authority.
