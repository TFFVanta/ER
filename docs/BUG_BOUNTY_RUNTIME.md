# EXOTIC Authorized Bug Bounty Runtime

## Purpose

The Bounty runtime continuously performs low-impact security posture checks for assets that the
operator is authorized to test. It is part of the EXOTIC bridge and desktop lifecycle, persists
its own state, and evaluates authority, exact scope, safety, cadence, and resource budgets before
every cycle.

It is not a general-purpose internet scanner. A running scheduler is not permission to test.

## Lifecycle

`startBridge()` starts the Bounty scheduler with the rest of the desktop bridge. The scheduler
records a heartbeat even when execution is held. Its effective status is derived on every cycle:

- `running`: all gates pass and an assessment may run
- `scope-locked`: no exact HTTPS asset is covered by an active authorization attestation
- `budget-paused`: the next complete bounded cycle cannot fit inside a resource ceiling
- `paused`: the operator paused cycles
- `emergency-stopped`: the global kill switch denies all execution
- `degraded`: an unexpected scheduler failure was recorded

The polling interval defaults to 60 seconds and can be changed with
`EXOTIC_BOUNTY_TICK_MS`. Assessment cadence is stored in runtime state and defaults to 30 minutes.

## Persistence

The runtime writes:

```text
.exotic/codex-bridge/bounty-state.json
```

Desktop installs use the same per-user bridge root configured by the Electron host. State includes
programs, assets, budgets, usage, goals, queue items, finding leads, run receipts, and audit events.
History and finding collections are bounded to prevent unattended growth.

## Required execution gates

Every automatic cycle must pass all of these checks:

1. Scheduler mode is running.
2. The global kill switch is clear.
3. A program is enabled.
4. The operator has explicitly attested authorization for that program.
5. The program has an HTTPS policy URL.
6. The asset belongs to that program and is enabled.
7. The asset is an exact HTTPS origin.
8. Daily and monthly dollar budgets can fund the complete check set.
9. Daily request and runtime budgets can fund the complete check set.
10. Rate and concurrency ceilings admit the selected work.

Wildcard domains are inventory-only. They never enter the automatic executor. IP literals,
loopback hosts, single-label hosts, and private-style names such as `.local` or `.internal` are
rejected by automatic scope enrollment.

## Automatic check set

Automatic cycles use two low-impact requests per exact authorized origin:

- a redirect-disabled `HEAD` request for HTTPS, security-header, and credentialed CORS posture
- a range-bounded `GET` request for `/.well-known/security.txt`

The runtime may create evidence-backed review leads for missing transport/browser hardening,
security contact discovery, or a credentialed CORS response that reflects the fixed untrusted
canary origin. Leads are unconfirmed and start in `needs-review`.

Authenticated testing, access-control validation, injection testing, business-logic testing,
proof-of-concept execution, and report submission remain approval-gated.

## Immutable automatic prohibitions

Normalization restores this list even if persisted state is edited:

- denial of service
- credential stuffing
- password spraying
- social engineering and phishing
- malware or persistence
- destructive data access
- third-party targeting
- scope bypass

## Default resource envelope

| Resource | Default |
| --- | ---: |
| Daily dollars | $5 |
| Monthly dollars | $100 |
| Estimated cost per request | $0.0025 |
| Requests per minute | 12 |
| Requests per day | 500 |
| Runtime minutes per day | 60 |
| Maximum concurrency | 2 |
| Request timeout | 8 seconds |

Usage resets by UTC day and month. A cycle fails closed when any remaining resource cannot fund
the entire two-request assessment.

## Bridge API

`GET /api/v1/bridge/bounty` returns the current persisted snapshot plus derived gates, remaining
budgets, metrics, and capability boundaries.

`POST /api/v1/bridge/bounty/actions` accepts:

- `upsert-program`
- `upsert-asset`
- `update-budgets`
- `update-goal`
- `set-control`
- `review-finding`
- `run-cycle`

All mutations are validated and appended to the audit history. `run-cycle` returns `409` when a
gate denies execution and includes the operator-readable reason.

Bounty reads and actions require a local bridge origin (`localhost`, `127.0.0.1`, IPv6 loopback,
desktop `null` origin, or a non-browser client without an `Origin` header). Action payloads are
limited to 256 KiB.

## Operator onboarding

There is no enrollment UI yet - the Operations Console's Bounty view is read-only. See
`docs/BUG_BOUNTY_MANUAL_ONBOARDING.md` for the actual API commands to run these steps today.

1. Open **Bounty → Programs + scope**.
2. Record the program name, platform, HTTPS policy URL, authorization note, and safe-harbor state.
3. Explicitly attest that testing is authorized under that policy.
4. Enroll an exact HTTPS origin for execution or a wildcard as inventory-only.
5. Review **Budgets + goals** and apply the intended hard ceilings.
6. Confirm every gate on **Overview**.
7. Run one bounded safe cycle and inspect its receipt.
8. Leave continuous cycles armed only while the scope and program policy remain current.

Human review remains required before any report is submitted.
