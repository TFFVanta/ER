# Manual Bug Bounty Onboarding

`docs/BUG_BOUNTY_RUNTIME.md`'s "Operator onboarding" section describes the steps in terms of UI
screens ("Bounty → Programs + scope", "Budgets + goals") that don't exist yet - the Operations
Console's Bounty view (`operations-console/src/app.js`) is read-only today. Until a real form
exists, onboarding a program means calling the bridge API directly. This doc is that missing
piece: the actual commands, run from the machine hosting the bridge.

Self-service enrollment (a stranger submitting their own program through a public form) is
deliberately not built. `authorizationAttested` is a checkbox with no independent verification -
a public form would let anyone point EXOTIC's traffic at a domain they don't control while merely
claiming authorization, and the operator (you) would bear the exposure if that claim were false.
Manual onboarding keeps a human - you - as the actual authorization check.

## Before running anything

Verify authorization yourself, out-of-band, before touching the API:

- Confirm the program is real: check it on the platform (HackerOne, Bugcrowd, etc.) or get the
  policy URL directly from someone at the company.
- Read the actual policy at that URL - safe harbor terms, in-scope assets, prohibited techniques.
- If you don't personally have a way to verify the person asking actually represents that program,
  don't enroll it. There's no technical safeguard behind `authorizationAttested` beyond your own
  judgment at this step.

## 1. Enroll the program

```bash
curl -s -X POST http://127.0.0.1:8787/api/v1/bridge/bounty/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsert-program",
    "value": {
      "name": "Example Corp",
      "platform": "HackerOne",
      "policyUrl": "https://hackerone.com/example-corp/policy",
      "handle": "example-corp",
      "authorizationAttested": true,
      "authorizationNote": "Verified against live H1 program page 2026-08-05.",
      "safeHarbor": true,
      "maxSeverity": "high"
    }
  }'
```

Required: `name`, and `policyUrl` (must be a valid HTTPS URL - the call throws otherwise).
`authorizationAttested: true` is what actually arms the program; leave it `false` (or omit it)
for anything not yet verified. The response includes the assigned `programId`
(`PROGRAM-<slug>` unless you passed one) - copy it for the next step.

## 2. Enroll an asset under that program

Only an **exact HTTPS origin** enters the automatic executor. Anything else (wildcard domains,
bare hostnames, IP literals, `.local`/`.internal`) is inventory-only and never auto-runs.

```bash
curl -s -X POST http://127.0.0.1:8787/api/v1/bridge/bounty/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsert-asset",
    "value": {
      "programId": "PROGRAM-EXAMPLE-CORP",
      "target": "https://app.example.com",
      "criticality": "high",
      "notes": "Primary web app, in scope per policy section 3."
    }
  }'
```

`programId` must match an already-enrolled program or this throws. `target` gets normalized and
classified (`safe-passive` for an exact HTTPS origin, `inventory-only` for anything broader).

## 3. Set budgets, if different from the defaults

Defaults are $5/day, $100/month, 500 requests/day, 60 runtime-minutes/day (see
`docs/BUG_BOUNTY_RUNTIME.md`'s resource envelope table). To change them:

```bash
curl -s -X POST http://127.0.0.1:8787/api/v1/bridge/bounty/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "update-budgets", "value": {"dailyUsd": 2, "monthlyUsd": 20}}'
```

## 4. Verify every gate before arming continuous cycles

Open the Operations Console's **Bounty** view (`Alt+6`) and confirm: kill switch clear, execution
policy `safe-passive`, authorization `REQUIRED` and actually attested for this program, budget
rows nowhere near their caps. Or read it directly:

```bash
curl -s http://127.0.0.1:8787/api/v1/bridge/bounty
```

## 5. Run one manual cycle first

Don't leave it on continuous polling until you've inspected one real receipt:

```bash
curl -s -X POST http://127.0.0.1:8787/api/v1/bridge/bounty/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "run-cycle"}'
```

Returns `409` with an operator-readable reason if any gate denies execution (this is the normal,
expected response if scope/budget/authorization isn't fully set up yet - not a bug).

## 6. Ongoing

The scheduler ticks on its own interval once armed (default 30 minutes between cycles, see
`EXOTIC_BOUNTY_TICK_MS`). Review leads under **needs-review** before anything is ever submitted -
human review is required before report submission, with no exception path.
