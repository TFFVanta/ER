# Autonomous Machine

The EXOTIC autonomous machine is exposed through the existing runtime CLI surface.

## Commands

From `C:\Projects\Exotic` after building:

```powershell
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous init --workspace C:\Projects\Exotic
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous start --workspace C:\Projects\Exotic
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous run-once --workspace C:\Projects\Exotic
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous status --workspace C:\Projects\Exotic
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous review --workspace C:\Projects\Exotic
exotic-runtime\out\build\x64-Release\Release\exotic-runtime-cli.exe autonomous stop --workspace C:\Projects\Exotic
```

## State

- Workspace state lives under `.exotic/`
- Machine status is written to `.exotic/dashboards/autonomous-status.json`
- The status dashboard includes `last_poll_at` and `last_idle_at` heartbeat timestamps while the worker loop is running
- The status dashboard includes `current_mode` and `idle_reason` so operators can tell whether the worker is polling, working, paused, stopping, or waiting for new eligible work
- The status dashboard includes `next_candidate_id` and `next_candidate_title` when repository inspection can already identify the next eligible autonomous change
- The status dashboard includes a short `recent_activity` list so operators can see recent poll decisions and control transitions without opening a run bundle
- The status dashboard includes `last_success_at` and `last_failure_at` so operators can immediately see the most recent successful autonomous action and the most recent failed run
- The status dashboard includes `stalled_for_seconds` so operators can spot a worker that is alive but has not completed any autonomous run recently
- The status dashboard includes `stalled_state` with simple buckets like `healthy`, `watch`, `stalled`, `paused`, and `stopping` so operator attention is easier to prioritize
- The status dashboard includes `stalled_reason` so operators can see why the machine is healthy, paused, waiting, stopping, or overdue for a completed run
- The status dashboard includes `attention_required` so downstream automation can react to a single alert bit without reimplementing status thresholds
- The status dashboard includes `attention_level`, `attention_category`, and `operator_hint` so operators and downstream tooling can separate healthy, warning, and critical situations without reverse-engineering the raw fields
- The status dashboard includes `runs_last_24h` so operators can tell whether the worker has actually been finishing autonomous runs recently
- The status dashboard includes `success_count_24h` and `failure_count_24h` so operators can gauge recent autonomous throughput and reliability at a glance
- The status dashboard includes `uptime_started_at` so operators can tell when the current worker process began running
- Review bundles are written to `.exotic/runs/<run-id>/`
- Example local configuration is written to `.exotic/autonomous/autonomous.conf.example`

## First Vertical Slice

The first implemented safe objective scans for the placeholder Forge test script in `apps/forge/package.json`.

When found, the machine:

1. Saves evidence as Idea, Objective, Proposal, Decision, Operation, and related typed records.
2. Replaces the placeholder test script.
3. Writes `apps/forge/tests/index.test.js`.
4. Runs `npm --prefix apps/forge test`.
5. Saves a review bundle with events, decisions, operations, verification, logs, artifacts, and next ideas.

## Limits

- The default `start` command runs a local autonomous worker loop in its own process and keeps polling until explicitly stopped.
- The current slice stays within Level 0-2 authority only.
- No external deployment, secrets, paid APIs, or third-party contact are attempted.
