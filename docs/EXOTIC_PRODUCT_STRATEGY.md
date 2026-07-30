# EXOTIC as a Product — Strategy Scoping

## The question being answered

Every monetization path discussed so far (bug bounty, Exotic Remedy) sells what EXOTIC *builds*
or *does*. This document scopes a different, unexplored path: selling EXOTIC **itself** — the
system, not its output — to other builders.

## What's actually sellable, ranked by differentiation

Not everything built this session is equally sellable. Two tiers:

**Genuinely differentiated (the real IP):**
1. **Evidence-gated autonomous work dispatch** (`@exotic/codex-worker` + the bridge's
   `updateRoadmapItem`) — an AI backend cannot mark work "completed" or advance progress without
   real evidence (working-tree diffs, command output). This is the actual safety story: it
   structurally prevents the "AI claims done, nothing changed" failure mode that plagues
   autonomous coding tools.
2. **Isolated execution with local-only integration** (`dev-admin.ts`) — every dispatch runs in
   a disposable git worktree on its own branch; a passing-tests gate must clear before
   `integrateIsolatedExecution` merges it into the real branch; nothing ever pushes, deploys, or
   touches secrets (`devAdminStatus().authority` declares this explicitly). A concrete, provable
   safety boundary, not a policy promise.
3. **Authorized, budget-gated bug bounty automation** — passive-only checks, hard dollar/request
   ceilings, explicit per-program authorization attestation, immutable prohibited-activity list.
   A narrow, well-scoped safety story for a specific niche (security teams, bounty hunters).

**Not differentiated (don't lead with these):**
- The two brand kits (`@exotic/ui`, `@exotic/ui-remedy`) — good internal tooling, not a product;
  every design-system-in-a-box competitor does this.
- `company-engine`'s ops/brand/finance dashboard — useful internally, but "a dashboard that reads
  your own repo" isn't a defensible product on its own.
- The roadmap pattern system — a reasonable internal DX choice, not something anyone would pay
  for standalone.

**The actual wedge is #1 and #2 together: an autonomous coding agent that structurally cannot
fake progress and cannot touch anything outside a disposable sandbox until tests pass.** That is
a real, provable differentiator against incumbents (Devin, Cursor Background Agents, Copilot
Workspace) whose safety stories are mostly policy/prompt-based, not structural.

## Who would actually buy this

- **Solo founders / indie hackers** running side projects solo (the same profile as this
  session's operator) who want autonomous work dispatch they can trust not to silently break
  things - smallest, most reachable buyer, but low willingness-to-pay individually.
- **Small dev teams** wanting a safer autonomous-agent layer than raw CLI usage, specifically for
  the evidence-gate + sandboxed-integration story - the more viable revenue segment, but requires
  competing for attention against well-funded, well-marketed incumbents.
- **Security-conscious teams / independent bounty hunters** wanting continuous, safe,
  budget-capped recon without hiring a pentester or risking an over-eager automated scanner -
  narrowest buyer, clearest pitch, smallest competitive set.

## Two possible wedges - pick one, not both

**Wedge A: package the bug bounty runtime standalone.**
- Pros: nearly done already (this session proved it end-to-end against a real target), narrow
  and clear buyer, doesn't require exposing the coding-agent core IP, fastest realistic path to
  a first paying customer.
- Cons: smaller addressable market, "one more security scanner" positioning risk unless the
  budget-ceiling/authorization-attestation safety story is made central to the pitch.
- Productization gap: multi-tenant auth, billing, a real UI beyond the bridge's raw JSON API,
  docs, a demo.

**Wedge B: package the evidence-gated dispatch + isolated-execution engine.**
- Pros: the bigger, more defensible differentiator; genuinely competes in a hot category
  (autonomous coding agents) with a real structural safety advantage.
- Cons: much larger productization lift (multi-repo support, auth, billing, a real UI, docs,
  support), and competing for attention against incumbents with far more capital and
  distribution. Higher risk, higher ceiling.
- Productization gap: everything Wedge A needs, plus multi-repo/multi-tenant isolation (today's
  `dev-admin.ts` assumes one repo, one bridge instance), a hosted option, and a much bigger
  documentation/trust-building effort before anyone hands it real work.

## Recommendation

**Start with Wedge A** (bug bounty runtime) if the goal is a real first customer soon - it's the
smallest gap between "what exists today" and "something someone could pay for." Treat Wedge B as
the larger, second-stage bet once there's real revenue and product-building bandwidth to compete
properly in the autonomous-coding-agent category - shipping it half-built into a crowded,
well-funded market is the likelier way to waste the differentiator, not prove it.

## What NOT to do

- Don't try to sell "EXOTIC" as one undifferentiated bundle (bridge + dashboards + brand kits +
  bounty runtime) - a buyer can't tell what they're actually paying for, and the real IP (the
  safety story) gets diluted by the parts that aren't differentiated.
- Don't productize Wedge B before Wedge A (or Remedy, or real bounty income) has proven there's
  appetite and generated capital to fund a harder, longer competitive fight.
- Don't open-source the core before deciding whether the IP itself or a hosted/managed layer on
  top of it is the actual business - that's a real fork in the road this document deliberately
  leaves open, since it depends on capital and risk appetite this document can't decide alone.
