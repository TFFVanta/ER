# EXOTIC Venture Model Specification

## Purpose

This specification defines the canonical venture model for EXOTIC.

It is the shared operating schema used by every studio, runtime surface, automation, artifact, and approval path. Its purpose is to ensure that EXOTIC behaves as one connected venture creation and operations workspace rather than a collection of disconnected tools.

## Core rule

Every meaningful object in EXOTIC must be traceable to:

1. A venture or parent operating scope.
2. A clear objective or decision context.
3. A responsible owner or execution system.
4. Verifiable evidence of state and completion.

## Executable schema

- Canonical workspace schema version: `1.0.0`.
- Documentation uses `snake_case` field names for readability; the TypeScript and JSON representation uses `camelCase`.
- Every generated identifier is venture-scoped. Entity and graph-edge identifiers must be globally unique within a workspace.
- Every persisted workspace is parsed by `@exotic/contracts`; invalid enum values, missing fields, duplicate identifiers, broken references, and incomplete output manifests are rejected.
- `@exotic/entity` validates each generated workspace before returning it.

## Canonical entity types

### Venture

The top-level operating container.

Required fields:

- `venture_id`
- `name`
- `type`
- `status`
- `thesis`
- `operator`
- `created_at`
- `updated_at`

Responsibilities:

- Defines the bounded thing being built or operated.
- Holds the business, product, brand, operational, and governance context.
- Owns the child objects below.

### Objective

A measurable intended outcome for a venture or sub-scope.

Required fields:

- `objective_id`
- `venture_id`
- `title`
- `summary`
- `owner`
- `priority`
- `status`
- `success_criteria`
- `due_context`

Responsibilities:

- Converts broad intent into explicit outcomes.
- Serves as the anchor for plans, workflows, artifacts, and evidence.

### Studio Scope

The studio-specific working surface for a shared venture.

Required fields:

- `studio_scope_id`
- `venture_id`
- `studio`
- `objective_ids`
- `status`
- `owner`

Responsibilities:

- Represents work happening in Ideas, Business, Product, Design, Website, Development, Marketing, Research, Workflows, or Operations.
- Must never become an isolated data model.

### Workflow

A sequence of work with state transitions.

Required fields:

- `workflow_id`
- `venture_id`
- `objective_ids`
- `title`
- `status`
- `owner`
- `inputs`
- `outputs`

Responsibilities:

- Coordinates execution.
- Connects tasks, checkpoints, handoffs, and automations.

### Task

An actionable unit of execution within a workflow.

Required fields:

- `task_id`
- `workflow_id`
- `venture_id`
- `title`
- `status`
- `owner`
- `action_type`
- `completion_criteria`

Responsibilities:

- Carries concrete execution.
- Can be human-led, agent-led, or mixed.

### Artifact

An editable output produced by work.

Required fields:

- `artifact_id`
- `venture_id`
- `objective_ids`
- `artifact_type`
- `title`
- `status`
- `location`
- `owner`
- `version`

Examples:

- strategy brief
- brand asset
- PRD
- design file
- code change
- website page
- workflow definition
- operating plan
- analytics report

Responsibilities:

- Represents real output, not commentary.
- Must be editable and linked to purpose and proof.

### Evidence Record

A proof-bearing record supporting a claim, completion state, or decision.

Required fields:

- `evidence_id`
- `venture_id`
- `related_entity_type`
- `related_entity_id`
- `evidence_type`
- `source`
- `captured_at`
- `verdict`

Examples:

- test result
- research citation
- metric snapshot
- approval record
- audit event
- screenshot
- runtime log

Responsibilities:

- Explains why the system believes something is true.
- Supports completion, approval, and operator trust.

### Decision

A governed choice that changes direction, scope, authority, launch posture, or resource use.

Required fields:

- `decision_id`
- `venture_id`
- `title`
- `scope`
- `status`
- `decision_owner`
- `approval_required`
- `evidence_ids`

Responsibilities:

- Separates analysis from approved commitment.
- Creates a durable governance trail.

### Approval

An explicit permission boundary.

Required fields:

- `approval_id`
- `venture_id`
- `decision_id` or `artifact_id`
- `requested_by`
- `required_by_role`
- `status`
- `approved_at`

Responsibilities:

- Enforces serious-business control.
- Makes authority visible.

### Resource

A constrained input used by the venture.

Required fields:

- `resource_id`
- `venture_id`
- `resource_type`
- `owner`
- `limit`
- `usage_state`

Examples:

- budget
- API usage
- infrastructure
- labor capacity
- model runtime

### Metric

A measured signal about health, performance, or completion.

Required fields:

- `metric_id`
- `venture_id`
- `name`
- `definition`
- `current_value`
- `target_value`
- `updated_at`

### Memory Record

A persisted context record that must be retrievable later.

Required fields:

- `memory_id`
- `venture_id`
- `kind`
- `summary`
- `source`
- `created_at`
- `relevance_tags`

## Relationship rules

- A `venture` contains `objectives`, `studio scopes`, `workflows`, `artifacts`, `decisions`, `approvals`, `metrics`, `resources`, and `memory records`.
- An `objective` may connect to many workflows, tasks, artifacts, decisions, metrics, and evidence records.
- A `workflow` contains tasks and produces artifacts and evidence.
- A `task` must belong to exactly one workflow and one venture.
- An `artifact` must connect to at least one objective or decision.
- An `evidence record` must point to a concrete related entity.
- A `decision` can require one or more approvals.
- A `studio scope` reads and writes shared venture objects rather than private isolated copies.

Relationships are materialized as typed graph edges with `fromEntityType`, `fromEntityId`, `relation`, `toEntityType`, and `toEntityId`. Canonical relation types are `contains`, `scopes`, `supports`, `implements`, `depends-on`, `produces`, `verifies`, `governs`, `measures`, and `remembers`. Both endpoints must resolve to entities in the same venture workspace.

## Lifecycle states

Minimum normalized states:

- `proposed`
- `active`
- `blocked`
- `paused`
- `completed`
- `archived`

Rules:

- `completed` requires evidence.
- `blocked` requires a blocker reason, owner, resolution criteria, and raised timestamp.
- `archived` must preserve traceability.
- No entity may silently disappear from the graph.

## Studio read and write contract

### Ideas

- Reads: venture, objectives, research, metrics
- Writes: idea artifacts, opportunity records, promoted venture candidates

### Business

- Reads: venture, objectives, research, metrics, approvals
- Writes: business strategy artifacts, assumptions, operating plans, decisions

### Product

- Reads: venture, business strategy, objectives, artifacts, constraints
- Writes: requirements, milestones, workflows, release artifacts

### Design

- Reads: objectives, brand assets, product requirements
- Writes: visual systems, interaction artifacts, design evidence

### Website

- Reads: brand, product, marketing, artifacts
- Writes: website assets, content, publishing artifacts, analytics hooks

### Development

- Reads: requirements, workflows, decisions, artifacts
- Writes: code artifacts, build results, verification evidence

### Marketing

- Reads: venture thesis, business strategy, brand, product outputs
- Writes: campaigns, messaging, distribution workflows, performance evidence

### Research

- Reads: venture questions, objectives, prior memory
- Writes: source records, findings, research artifacts, citations

### Workflows

- Reads: all active execution objects
- Writes: workflow definitions, automations, handoffs, runtime state

### Operations

- Reads: all active state, metrics, evidence, approvals, runtime outputs
- Writes: operational checkpoints, issue records, performance reviews, control actions

## Completion logic

An objective is complete only when:

- required artifacts exist,
- evidence supports completion,
- open blockers are resolved or explicitly accepted,
- dependent approvals are satisfied,
- related metrics are updated where applicable.

A venture workspace is professionally complete only when it contains:

- venture definition,
- business strategy,
- objective structure,
- studio scopes,
- workflows,
- editable artifacts,
- approval logic,
- evidence records,
- metrics and observability,
- operating history.

## Authority and approval rules

- Strategy changes require decision records.
- Launch readiness requires explicit approval.
- Material resource commitments require approval.
- Autonomous execution must not bypass approval-gated decisions.
- The operator must be able to inspect why an action was or was not allowed.

## Evidence standards

Every completion claim should be supportable by at least one of:

- artifact version
- validation result
- citation or research source
- metric snapshot
- audit event
- approval record
- runtime execution trace

## Minimum generated workspace output

When EXOTIC receives a broad request such as `build this business`, the generated venture workspace should include at minimum:

- venture record
- objective hierarchy
- studio scopes
- initial workflows
- business strategy artifact
- product requirements artifact
- brand or design seed artifact
- implementation workstream
- website workstream
- marketing workstream
- approvals queue
- metrics scaffold
- evidence scaffold

The generated workspace carries an `outputManifest` that maps every required output above to one or more concrete entity identifiers. Missing outputs, empty mappings, and references to absent entities fail contract validation.

## Definition of done for the model

The venture model is ready for implementation when:

- entity definitions are stable,
- relationship rules are explicit,
- lifecycle states are normalized,
- studios have read and write contracts,
- completion requires evidence,
- authority boundaries are defined,
- generated workspaces can target this schema directly.

The implementation satisfies this model boundary when the types, deep contract checks, generator, runtime persistence, and anti-theater tests pass together. Studio-specific artifact content and downstream execution quality remain separate delivery milestones.
