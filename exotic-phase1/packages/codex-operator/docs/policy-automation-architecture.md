# Policy Automation Architecture

The Policy Automation Engine evaluates reusable automation rules over verification and governance state.

Primary responsibilities:

- Register reusable automation policies.
- Evaluate policy rules against a specific session.
- Delegate automatic approval, rejection, or escalation to `GovernanceEngine`.
- Preserve governance and verification as the source of truth instead of duplicating their state.
- Emit immutable policy automation events onto the existing EXOTIC `EventBus`.

Core components:

- `PolicyAutomationEngine`: orchestration facade for automation registration, evaluation, snapshots, and API access.
- `PolicyAutomationEventStream`: event adapter for automation registration, evaluation, and action events.
- `PolicyAutomationEngineApi`: read-only facade for registered automations, evaluations, and metrics.
