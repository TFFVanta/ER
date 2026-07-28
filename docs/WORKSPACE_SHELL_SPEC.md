# EXOTIC Unified Workspace Shell

## Purpose

`apps/studio` is the canonical human workspace for an EXOTIC venture. Ideas, Business, Product,
Design, Website, Development, Marketing, Research, Workflows, and Operations are views over one
`VentureWorkspace`; they are not independent applications or private stores.

## Runtime contract

The shell reads live state from the Codex bridge:

- `GET /api/v1/bridge/workspace` supplies the canonical venture graph.
- `GET /api/v1/bridge/state` supplies current operations, roadmap, evidence, and automation state.
- `POST /api/v1/bridge/auto-mode` starts or pauses governed autonomous execution.
- `POST /api/v1/bridge/message` records a selected-object review request in the shared relay.

The bridge URL defaults to `http://127.0.0.1:8787` and can be changed with
`VITE_EXOTIC_BRIDGE_URL`. The shell shows an explicit offline state when the bridge is unavailable;
it does not substitute demo data.

## Shared context

The venture context remains active while the operator moves between studios and views. The shell
derives studio ownership from canonical graph edges:

- `task implements studio-scope` assigns executable work to a studio.
- `task produces artifact` assigns editable output to that work.
- `studio-scope supports objective` keeps every studio aligned to venture outcomes.
- Evidence, decisions, approvals, resources, metrics, and memory stay venture-scoped.

The right inspector follows the selected graph entity and exposes its owner, lifecycle state,
evidence count, relationships, completion criteria, and concrete operations actions.

## Views

### Workbench

Shows the active studio scope, shared objectives, graph-linked execution queue, and editable-output
records. Completion is computed from actual task and artifact lifecycle states.

### Graph

Shows the venture root and all ten studio scopes as an interactive system map backed by the current
entity and edge counts.

### Evidence

Shows evidence records, decisions, and approvals from the same workspace. This is the trust and
authority surface, not a separate reporting store.

### Operations

Shows live auto-mode state, verification posture, venture metrics, and the shared build roadmap.
Start/pause controls act on the same bridge used by the operations console.

## Persistence migration

The bridge detects valid but older generated workspaces that lack `implements` or `produces` edges.
It regenerates the canonical graph using the existing venture ID and merges existing lifecycle
states, evidence, decisions, approvals, resources, metrics, memory, and runtime edges. The migrated
workspace is contract-validated before persistence.

## Definition of done

The unified shell boundary is locked when:

- all ten studios render from one canonical venture workspace,
- task and artifact ownership comes from graph edges rather than frontend guesses,
- graph, evidence, approvals, and operations remain available without changing venture context,
- auto mode and review actions reach the real bridge,
- disconnected state is explicit,
- desktop and mobile layouts have no horizontal overflow,
- model tests, lint, production build, runtime migration test, and monorepo verification pass.

Artifact editors, broad-request intake, generation review, and the first complete studio execution
chain build on this shell in P1-04 and later milestones.
