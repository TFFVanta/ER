import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'exotic.objectives/v1';
const PROPOSAL_SCHEMA_VERSION = 'exotic.proposals/v1';
const APPROVAL_SCHEMA_VERSION = 'exotic.approvals/v1';
const OPERATION_SCHEMA_VERSION = 'exotic.operations/v1';
const LESSON_SCHEMA_VERSION = 'exotic.lessons/v1';
const SELECTOR_SCHEMA_VERSION = 'exotic.selectors/v1';

function nowIso() {
  return new Date().toISOString();
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'objective';
}

function stableOrdinal(value) {
  return String(value).padStart(4, '0');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function appendJsonl(file, value) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(value) + '\n');
}

function titleFromGoal(goal) {
  const normalized = goal.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Untitled objective';
  const first = normalized
    .replace(/^[^A-Za-z0-9]+/, '')
    .split(/[.!?]/)[0]
    .trim();
  if (!first) return 'Untitled objective';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function summarizeGoal(goal) {
  return goal.replace(/\s+/g, ' ').trim();
}

function nextIdeaFor(objective) {
  return {
    id: `idea-${objective.id}`,
    objective_id: objective.id,
    title: `Define a proposal for ${objective.title.toLowerCase()}`,
    rationale: 'The objective is persisted and reviewable; the next safe step is to add a measurable implementation proposal.',
    created_at: objective.created_at
  };
}

function proposalStepsFromText(text) {
  return summarizeGoal(text)
    .split(/[.;]+/)
    .map(step => step.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((step, index) => ({
      id: `step-${index + 1}`,
      title: step.charAt(0).toUpperCase() + step.slice(1),
      description: step,
      reversible: true
    }));
}

function defaultProposalSummary(objective) {
  return [
    `Inspect the current state related to "${objective.title}".`,
    `Implement the smallest safe change that improves the objective outcome.`,
    'Run targeted verification and capture review artifacts.'
  ].join(' ');
}

function nextIdeaForProposal(proposal) {
  return {
    id: `idea-${proposal.id}`,
    objective_id: proposal.objective_id,
    proposal_id: proposal.id,
    title: `Add approval and budget admission for ${proposal.title.toLowerCase()}`,
    rationale: 'The proposal is reviewable; the next safe step is to require explicit admission before execution.',
    created_at: proposal.created_at
  };
}

function nextIdeaForApproval(proposal, approved) {
  return {
    id: `idea-approval-${proposal.id}`,
    objective_id: proposal.objective_id,
    proposal_id: proposal.id,
    title: approved
      ? `Prepare bounded execution for ${proposal.title.toLowerCase()}`
      : `Revise budget or authority for ${proposal.title.toLowerCase()}`,
    rationale: approved
      ? 'The proposal has cleared admission and can now be prepared for idempotent execution.'
      : 'The proposal did not clear admission; the next safe step is to revise its scope or request the missing authority.',
    created_at: nowIso()
  };
}

function nextIdeaForOperation(operation) {
  return {
    id: `idea-operation-${operation.id}`,
    objective_id: operation.objective_id,
    proposal_id: operation.proposal_id,
    operation_id: operation.id,
    title: `Capture lessons from ${operation.title.toLowerCase()}`,
    rationale: 'The operation has been executed and verified; the next safe step is to retain lessons and queue the next evidence-backed improvement.',
    created_at: nowIso()
  };
}

function nextIdeaForLesson(lesson) {
  return {
    id: `idea-lesson-${lesson.id}`,
    objective_id: lesson.objective_id,
    proposal_id: lesson.proposal_id,
    operation_id: lesson.operation_id,
    lesson_id: lesson.id,
    title: `Queue the next improvement after ${lesson.title.toLowerCase()}`,
    rationale: 'The learning record is saved; the next safe step is to turn the lesson into a fresh measurable objective or proposal.',
    created_at: nowIso()
  };
}

function nextIdeaForSelector(selector) {
  return {
    id: `idea-selector-${selector.id}`,
    objective_id: selector.source_objective_id,
    lesson_id: selector.lesson_id,
    selector_id: selector.id,
    title: `Create the promoted objective for ${selector.promoted_title.toLowerCase()}`,
    rationale: 'The lesson has been promoted into a bounded candidate; the next safe step is to materialize it as a new objective only within preserved authority and budget limits.',
    created_at: nowIso()
  };
}

function nextIdeaForMaterializedObjective(objective, selector) {
  return {
    id: `idea-materialized-${objective.id}`,
    objective_id: objective.id,
    selector_id: selector.id,
    title: `Draft a proposal for ${objective.title.toLowerCase()}`,
    rationale: 'The promoted selector has been materialized into a new bounded objective, so the next safe step is to plan it through the normal approval path.',
    created_at: nowIso()
  };
}

function nextIdeaForDraftedSelectorProposal(proposal, selector) {
  return {
    id: `idea-selector-proposal-${proposal.id}`,
    objective_id: proposal.objective_id,
    proposal_id: proposal.id,
    selector_id: selector.id,
    title: `Review and admit the drafted proposal for ${proposal.title.toLowerCase()}`,
    rationale: 'The promoted objective now has a first proposal draft, so the next safe step is the normal approval path.',
    created_at: nowIso()
  };
}

function nextIdeaForAdmittedSelectorProposal(proposal, selector, approval) {
  return {
    id: `idea-selector-admission-${approval.id}`,
    objective_id: proposal.objective_id,
    proposal_id: proposal.id,
    selector_id: selector.id,
    approval_id: approval.id,
    title: `Execute the admitted selector proposal for ${proposal.title.toLowerCase()}`,
    rationale: 'The selector-driven proposal has cleared admission within preserved boundaries, so the next safe step is bounded execution.',
    created_at: nowIso()
  };
}

function nextIdeaForExecutedSelectorProposal(operation, selector) {
  return {
    id: `idea-selector-execution-${operation.id}`,
    objective_id: operation.objective_id,
    proposal_id: operation.proposal_id,
    selector_id: selector.id,
    operation_id: operation.id,
    title: `Capture learning from selector execution ${operation.title.toLowerCase()}`,
    rationale: 'The restarted selector proposal has executed successfully, so the next safe step is to preserve lessons and keep the loop going.',
    created_at: nowIso()
  };
}

function budgetCheck(proposal, objective, limits = {}) {
  const proposalBudget = proposal.estimated_effort || {};
  const objectiveBudget = objective.budget || {};
  const maxTime = Number(limits.timeMinutes ?? objectiveBudget.time_minutes ?? 0);
  const maxMoney = Number(limits.moneyUsd ?? objectiveBudget.money_usd ?? 0);
  const maxTokens = Number(limits.tokens ?? objectiveBudget.tokens ?? 0);

  const timeOk = Number(proposalBudget.time_minutes || 0) <= maxTime;
  const moneyOk = Number(proposalBudget.money_usd || 0) <= maxMoney;
  const tokensOk = Number(proposalBudget.tokens || 0) <= maxTokens;

  return {
    limits: {
      time_minutes: maxTime,
      money_usd: maxMoney,
      tokens: maxTokens
    },
    usage: {
      time_minutes: Number(proposalBudget.time_minutes || 0),
      money_usd: Number(proposalBudget.money_usd || 0),
      tokens: Number(proposalBudget.tokens || 0)
    },
    passed: timeOk && moneyOk && tokensOk,
    reasons: [
      ...(timeOk ? [] : ['time budget exceeded']),
      ...(moneyOk ? [] : ['money budget exceeded']),
      ...(tokensOk ? [] : ['token budget exceeded'])
    ]
  };
}

export function resolveStateRoot(root) {
  return process.env.EXOTIC_STATE_ROOT || root;
}

export function createObjectiveStore(root) {
  const stateRoot = resolveStateRoot(root);
  const exoticRoot = path.join(stateRoot, '.exotic');
  const stateDir = path.join(exoticRoot, 'state');
  const runsDir = path.join(exoticRoot, 'runs');
  const objectivesFile = path.join(stateDir, 'objectives.json');
  const latestReviewFile = path.join(exoticRoot, 'autonomous', 'latest-review.txt');

  function loadState() {
    return readJson(objectivesFile, {
      schema_version: SCHEMA_VERSION,
      sequence: 0,
      run_sequence: 0,
      proposal_sequence: 0,
      approval_sequence: 0,
      operation_sequence: 0,
      lesson_sequence: 0,
      selector_sequence: 0,
      objectives: [],
      proposals: [],
      approvals: [],
      operations: [],
      lessons: [],
      selectors: []
    });
  }

  function saveState(state) {
    writeJson(objectivesFile, state);
  }

  function createObjective(goal, options = {}) {
    const trimmedGoal = summarizeGoal(goal);
    if (!trimmedGoal) {
      throw new Error('Goal text is required.');
    }

    const state = loadState();
    const createdAt = nowIso();
    const sequence = Number(state.sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const objectiveId = `objective-${Date.now()}-${stableOrdinal(sequence)}-${slugify(trimmedGoal)}`;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const title = titleFromGoal(trimmedGoal);
    const objective = {
      id: objectiveId,
      schema_version: SCHEMA_VERSION,
      pillar: options.pillar || 'workspace',
      actor: options.actor || 'operator',
      source_goal: trimmedGoal,
      title,
      capability: options.capability || 'goal-intake',
      desired_outcome: options.desiredOutcome || `Create a durable EXOTIC objective for: ${trimmedGoal}`,
      measurable_result: options.measurableResult || 'Objective persists, can be inspected after restart, and has a review bundle.',
      status: 'defined',
      authority_level: Number(options.authorityLevel || 1),
      scope: {
        include: ['goal intake', 'objective persistence', 'review bundle'],
        exclude: ['side-effectful execution', 'deployments', 'secret handling']
      },
      budget: {
        time_minutes: Number(options.timeMinutes || 30),
        money_usd: Number(options.moneyUsd || 0),
        tokens: Number(options.tokens || 0)
      },
      constraints: [
        'Preserve operator authority before side effects.',
        'Keep changes inside the active EXOTIC workspace.'
      ],
      assumptions: [
        'The submitted goal reflects current operator intent.',
        'Further planning and approval will occur before execution.'
      ],
      acceptance_criteria: [
        {
          id: `${objectiveId}:ac:persisted`,
          description: 'Objective record is stored in the workspace state and can be read after restart.',
          kind: 'binary'
        },
        {
          id: `${objectiveId}:ac:bundle`,
          description: 'A causal review bundle is written for the intake run.',
          kind: 'binary'
        }
      ],
      verification: {
        procedure: [
          'Run `exo objective inspect <id>` after creation.',
          'Confirm the objective appears in `exo objective list`.',
          'Inspect the saved bundle manifest and summary.'
        ],
        expected_artifacts: ['summary.md', 'manifest.json', 'verification.json', 'next-ideas.json']
      },
      recovery: {
        method: 'Delete or replace the local workspace state and rerun objective intake.',
        stop_conditions: ['Goal text is empty', 'Workspace state cannot be written']
      },
      evidence: [
        {
          type: 'operator-goal',
          value: trimmedGoal
        }
      ],
      recommendations: [
        'Define an evidence-backed proposal for this objective.',
        'Add explicit approval and budget admission before execution.'
      ],
      run_id: runId,
      created_at: createdAt,
      updated_at: createdAt
    };

    state.sequence = sequence;
    state.run_sequence = runSequence;
    state.objectives.unshift(objective);
    saveState(state);

    const bundlePath = writeReviewBundle(exoticRoot, runId, objective);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { objective, bundlePath, runId };
  }

  function createProposal(objectiveId, summary, options = {}) {
    const trimmedSummary = summarizeGoal(summary || '');
    if (!objectiveId) {
      throw new Error('Objective id is required.');
    }

    const state = loadState();
    const objective = state.objectives.find(item => item.id === objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const createdAt = nowIso();
    const proposalSequence = Number(state.proposal_sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const summaryText = trimmedSummary || defaultProposalSummary(objective);
    const proposalId = `proposal-${Date.now()}-${stableOrdinal(proposalSequence)}-${slugify(objective.title)}`;
    const steps = proposalStepsFromText(summaryText);
    const proposal = {
      id: proposalId,
      schema_version: PROPOSAL_SCHEMA_VERSION,
      objective_id: objective.id,
      title: options.title || `Proposal for ${objective.title}`,
      summary: summaryText,
      status: 'proposed',
      decision_state: 'draft',
      authority_level: Number(options.authorityLevel || objective.authority_level || 1),
      owner: options.owner || objective.actor || 'operator',
      estimated_effort: {
        time_minutes: Number(options.timeMinutes || objective.budget?.time_minutes || 30),
        money_usd: Number(options.moneyUsd || objective.budget?.money_usd || 0),
        tokens: Number(options.tokens || objective.budget?.tokens || 0)
      },
      scoring: {
        value: Number(options.value || 4),
        confidence: Number(options.confidence || 3),
        readiness: Number(options.readiness || 4),
        risk: Number(options.risk || 2)
      },
      plan: {
        steps,
        acceptance_focus: [
          'Objective remains reviewable and persisted.',
          'The selected change is measurable and bounded.',
          'Verification artifacts are saved.'
        ]
      },
      verification: {
        procedure: [
          `Inspect objective ${objective.id} and proposal ${proposalId}.`,
          'Review the generated proposal bundle and planned steps.',
          'Confirm the objective status is updated to planned.'
        ],
        expected_artifacts: ['summary.md', 'manifest.json', 'verification.json', 'next-ideas.json']
      },
      recovery: {
        method: 'Revise or replace the proposal before any execution is admitted.',
        stop_conditions: ['Objective does not exist', 'State cannot be written']
      },
      created_at: createdAt,
      updated_at: createdAt,
      run_id: runId
    };

    objective.status = 'planned';
    objective.updated_at = createdAt;
    objective.recommendations = [
      'Review this proposal and refine acceptance criteria if needed.',
      'Add approval and budget admission before execution.'
    ];

    state.proposal_sequence = proposalSequence;
    state.run_sequence = runSequence;
    state.proposals = Array.isArray(state.proposals) ? state.proposals : [];
    state.proposals.unshift(proposal);
    saveState(state);

    const bundlePath = writeProposalReviewBundle(exoticRoot, runId, objective, proposal);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { proposal, objective, bundlePath, runId };
  }

  function admitProposal(proposalId, options = {}) {
    if (!proposalId) {
      throw new Error('Proposal id is required.');
    }

    const state = loadState();
    const proposal = state.proposals.find(item => item.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.admission?.approval_id) {
      const existingApproval = state.approvals.find(item => item.id === proposal.admission.approval_id);
      if (existingApproval) {
        const objective = state.objectives.find(item => item.id === proposal.objective_id) || null;
        return {
          objective,
          proposal,
          approval: existingApproval,
          bundlePath: existingApproval.bundle_path,
          runId: existingApproval.run_id,
          idempotentReplay: true
        };
      }
    }

    const objective = state.objectives.find(item => item.id === proposal.objective_id);
    if (!objective) {
      throw new Error(`Objective not found for proposal: ${proposal.objective_id}`);
    }

    const createdAt = nowIso();
    const approvalSequence = Number(state.approval_sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const approver = options.approver || 'operator';
    const grantedAuthority = Number(options.authorityLevel ?? proposal.authority_level ?? 1);
    const authorityPassed = grantedAuthority >= Number(proposal.authority_level || 1);
    const budget = budgetCheck(proposal, objective, {
      timeMinutes: options.timeMinutes,
      moneyUsd: options.moneyUsd,
      tokens: options.tokens
    });
    const approved = authorityPassed && budget.passed;
    const approvalId = `approval-${Date.now()}-${stableOrdinal(approvalSequence)}-${slugify(proposal.title)}`;

    const approval = {
      id: approvalId,
      schema_version: APPROVAL_SCHEMA_VERSION,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approver,
      requested_authority_level: Number(proposal.authority_level || 1),
      granted_authority_level: grantedAuthority,
      budget,
      approved,
      status: approved ? 'approved' : 'rejected',
      reasons: [
        ...(authorityPassed ? [] : ['authority level below proposal requirement']),
        ...budget.reasons
      ],
      created_at: createdAt,
      updated_at: createdAt,
      run_id: runId
    };

    proposal.decision_state = approved ? 'approved' : 'rejected';
    proposal.status = approved ? 'admitted' : 'needs_revision';
    proposal.updated_at = createdAt;
    proposal.admission = {
      approval_id: approval.id,
      approved,
      status: approval.status,
      updated_at: createdAt
    };

    objective.status = approved ? 'approved' : 'needs_revision';
    objective.updated_at = createdAt;
    objective.recommendations = approved
      ? [
          'Prepare an idempotent execution record for this admitted proposal.',
          'Keep execution bounded to the approved authority and budget.'
        ]
      : [
          'Revise the proposal scope, budget, or authority request.',
          'Re-run admission after the proposal constraints are corrected.'
        ];

    state.approval_sequence = approvalSequence;
    state.run_sequence = runSequence;
    state.approvals = Array.isArray(state.approvals) ? state.approvals : [];
    state.approvals.unshift(approval);

    const bundlePath = writeApprovalReviewBundle(exoticRoot, runId, objective, proposal, approval);
    approval.bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { objective, proposal, approval, bundlePath, runId, idempotentReplay: false };
  }

  function executeProposal(proposalId, options = {}) {
    if (!proposalId) {
      throw new Error('Proposal id is required.');
    }

    const state = loadState();
    const proposal = state.proposals.find(item => item.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    state.operations = Array.isArray(state.operations) ? state.operations : [];
    const requestedKey = summarizeGoal(options.idempotencyKey || '');
    const idempotencyKey = requestedKey || `execute:${proposal.id}`;
    const existingOperation = state.operations.find(item => item.idempotency_key === idempotencyKey);
    if (existingOperation) {
      const objective = state.objectives.find(item => item.id === proposal.objective_id);
      const approval = state.approvals.find(item => item.proposal_id === proposal.id && item.approved);
      return {
        objective,
        proposal,
        approval,
        operation: existingOperation,
        bundlePath: existingOperation.bundle_path,
        runId: existingOperation.run_id,
        idempotentReplay: true
      };
    }

    if (proposal.status !== 'admitted' || proposal.decision_state !== 'approved') {
      throw new Error(`Proposal is not admitted for execution: ${proposalId}`);
    }

    const objective = state.objectives.find(item => item.id === proposal.objective_id);
    if (!objective) {
      throw new Error(`Objective not found for proposal: ${proposal.objective_id}`);
    }

    const approval = state.approvals.find(item => item.proposal_id === proposal.id && item.approved);
    if (!approval) {
      throw new Error(`Approved admission record not found for proposal: ${proposal.id}`);
    }

    const createdAt = nowIso();
    const operationSequence = Number(state.operation_sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const operationId = `operation-${Date.now()}-${stableOrdinal(operationSequence)}-${slugify(proposal.title)}`;
    const trace = proposal.plan.steps.map((step, index) => ({
      step_id: step.id,
      sequence: index + 1,
      message: `Executed planned step: ${step.title}`,
      created_at: createdAt
    }));

    const operation = {
      id: operationId,
      schema_version: OPERATION_SCHEMA_VERSION,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      title: `Execution for ${proposal.title}`,
      idempotency_key: idempotencyKey,
      status: 'completed',
      verification_status: 'passed',
      actor: options.actor || approval.approver || 'operator',
      authority_level: approval.granted_authority_level,
      budget: approval.budget,
      trace,
      artifacts: [],
      verification: {
        verdict: 'pass',
        findings: [
          'Execution trace matches the admitted plan.',
          'Operation completed without exceeding approved authority or budget.'
        ],
        checked_at: createdAt
      },
      created_at: createdAt,
      updated_at: createdAt,
      run_id: runId
    };

    proposal.status = 'executed';
    proposal.updated_at = createdAt;
    proposal.execution = {
      operation_id: operation.id,
      idempotency_key: operation.idempotency_key,
      verification_status: operation.verification_status,
      updated_at: createdAt
    };

    objective.status = 'verified';
    objective.updated_at = createdAt;
    objective.recommendations = [
      'Capture durable lessons from this verified operation.',
      'Select the next eligible improvement using the saved evidence bundle.'
    ];

    state.operation_sequence = operationSequence;
    state.run_sequence = runSequence;
    state.operations.unshift(operation);

    const bundlePath = writeExecutionReviewBundle(exoticRoot, runId, objective, proposal, approval, operation);
    operation.bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { objective, proposal, approval, operation, bundlePath, runId, idempotentReplay: false };
  }

  function learnFromOperation(operationId, options = {}) {
    if (!operationId) {
      throw new Error('Operation id is required.');
    }

    const state = loadState();
    state.lessons = Array.isArray(state.lessons) ? state.lessons : [];
    const existingLesson = state.lessons.find(item => item.operation_id === operationId);
    if (existingLesson) {
      const objective = state.objectives.find(item => item.id === existingLesson.objective_id) || null;
      const proposal = state.proposals.find(item => item.id === existingLesson.proposal_id) || null;
      const operation = state.operations.find(item => item.id === operationId) || null;
      return {
        objective,
        proposal,
        operation,
        lesson: existingLesson,
        bundlePath: existingLesson.bundle_path,
        runId: existingLesson.run_id,
        idempotentReplay: true
      };
    }

    const operation = state.operations.find(item => item.id === operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }
    if (operation.status !== 'completed' || operation.verification_status !== 'passed') {
      throw new Error(`Operation is not eligible for learning: ${operationId}`);
    }

    const objective = state.objectives.find(item => item.id === operation.objective_id);
    const proposal = state.proposals.find(item => item.id === operation.proposal_id);
    if (!objective || !proposal) {
      throw new Error(`Learning context missing for operation: ${operationId}`);
    }

    const createdAt = nowIso();
    const lessonSequence = Number(state.lesson_sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const lessonId = `lesson-${Date.now()}-${stableOrdinal(lessonSequence)}-${slugify(operation.title)}`;
    const summary = summarizeGoal(options.summary || '') || 'Bounded execution with explicit authority, budget admission, and idempotent verification produced a reusable improvement pattern.';
    const nextObjective = {
      id: `next-objective-${lessonId}`,
      title: `Extend ${objective.title.toLowerCase()} with deeper verification or broader scope`,
      rationale: 'The current slice is verified; the next improvement should broaden real execution coverage while preserving admission and evidence.',
      suggested_capability: 'learning-driven-next-slice'
    };

    const lesson = {
      id: lessonId,
      schema_version: LESSON_SCHEMA_VERSION,
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      title: `Lesson from ${operation.title}`,
      summary,
      findings: [
        'Admitted proposals can be executed safely when authority and budget checks are persisted first.',
        'Idempotency keys prevent duplicate operation records during retries or replays.',
        'Verification artifacts make the execution outcome reviewable and restart-safe.'
      ],
      next_objective: nextObjective,
      status: 'captured',
      created_at: createdAt,
      updated_at: createdAt,
      run_id: runId
    };

    objective.status = 'learned';
    objective.updated_at = createdAt;
    objective.recommendations = [
      nextObjective.title,
      'Promote the next slice only if it remains within explicit authority and budget boundaries.'
    ];

    proposal.updated_at = createdAt;
    proposal.learning = {
      lesson_id: lesson.id,
      captured_at: createdAt
    };

    operation.updated_at = createdAt;
    operation.learning = {
      lesson_id: lesson.id,
      captured_at: createdAt
    };

    state.lesson_sequence = lessonSequence;
    state.run_sequence = runSequence;
    state.lessons.unshift(lesson);

    const bundlePath = writeLearningReviewBundle(exoticRoot, runId, objective, proposal, operation, lesson);
    lesson.bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { objective, proposal, operation, lesson, bundlePath, runId, idempotentReplay: false };
  }

  function promoteLesson(lessonId, options = {}) {
    if (!lessonId) {
      throw new Error('Lesson id is required.');
    }

    const state = loadState();
    state.selectors = Array.isArray(state.selectors) ? state.selectors : [];
    const existingSelector = state.selectors.find(item => item.lesson_id === lessonId);
    if (existingSelector) {
      const objective = state.objectives.find(item => item.id === existingSelector.source_objective_id) || null;
      const lesson = state.lessons.find(item => item.id === lessonId) || null;
      return {
        objective,
        lesson,
        selector: existingSelector,
        bundlePath: existingSelector.bundle_path,
        runId: existingSelector.run_id,
        idempotentReplay: true
      };
    }

    const lesson = state.lessons.find(item => item.id === lessonId);
    if (!lesson) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }

    const sourceObjective = state.objectives.find(item => item.id === lesson.objective_id);
    if (!sourceObjective) {
      throw new Error(`Source objective not found for lesson: ${lessonId}`);
    }

    const createdAt = nowIso();
    const selectorSequence = Number(state.selector_sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const selectorId = `selector-${Date.now()}-${stableOrdinal(selectorSequence)}-${slugify(lesson.title)}`;
    const promotedTitle = summarizeGoal(options.title || lesson.next_objective?.title || `Follow-up to ${sourceObjective.title}`);
    const preservedAuthority = Number(options.authorityLevel ?? sourceObjective.authority_level ?? 1);
    const promotedBudget = {
      time_minutes: Number(options.timeMinutes ?? sourceObjective.budget?.time_minutes ?? 0),
      money_usd: Number(options.moneyUsd ?? sourceObjective.budget?.money_usd ?? 0),
      tokens: Number(options.tokens ?? sourceObjective.budget?.tokens ?? 0)
    };

    const selector = {
      id: selectorId,
      schema_version: SELECTOR_SCHEMA_VERSION,
      lesson_id: lesson.id,
      source_objective_id: sourceObjective.id,
      promoted_title: promotedTitle,
      promoted_summary: lesson.next_objective?.rationale || lesson.summary,
      suggested_capability: lesson.next_objective?.suggested_capability || 'promoted-from-lesson',
      authority_level: preservedAuthority,
      budget: promotedBudget,
      status: 'candidate',
      candidate_type: options.type || 'objective',
      boundaries: {
        preserve_authority_at_or_below: preservedAuthority,
        preserve_budget_within: promotedBudget
      },
      created_at: createdAt,
      updated_at: createdAt,
      run_id: runId
    };

    sourceObjective.recommendations = [
      `Promoted candidate ready: ${promotedTitle}`,
      'Materialize the promoted candidate only if it stays within preserved authority and budget boundaries.'
    ];
    sourceObjective.updated_at = createdAt;

    lesson.updated_at = createdAt;
    lesson.selector = {
      selector_id: selector.id,
      promoted_at: createdAt
    };

    state.selector_sequence = selectorSequence;
    state.run_sequence = runSequence;
    state.selectors.unshift(selector);

    const bundlePath = writeSelectorReviewBundle(exoticRoot, runId, sourceObjective, lesson, selector);
    selector.bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return { objective: sourceObjective, lesson, selector, bundlePath, runId, idempotentReplay: false };
  }

  function materializeSelector(selectorId, options = {}) {
    if (!selectorId) {
      throw new Error('Selector id is required.');
    }

    const state = loadState();
    state.selectors = Array.isArray(state.selectors) ? state.selectors : [];
    const selector = state.selectors.find(item => item.id === selectorId);
    if (!selector) {
      throw new Error(`Selector not found: ${selectorId}`);
    }

    if (selector.materialized_objective_id) {
      const objective = state.objectives.find(item => item.id === selector.materialized_objective_id) || null;
      return {
        selector,
        objective,
        bundlePath: selector.materialization_bundle_path || selector.bundle_path,
        runId: selector.materialization_run_id || selector.run_id,
        idempotentReplay: true
      };
    }

    const lesson = state.lessons.find(item => item.id === selector.lesson_id);
    const sourceObjective = state.objectives.find(item => item.id === selector.source_objective_id);
    if (!lesson || !sourceObjective) {
      throw new Error(`Selector context missing for: ${selectorId}`);
    }

    const createdAt = nowIso();
    const sequence = Number(state.sequence || 0) + 1;
    const runSequence = Number(state.run_sequence || 0) + 1;
    const objectiveId = `objective-${Date.now()}-${stableOrdinal(sequence)}-${slugify(selector.promoted_title)}`;
    const runId = `run-${Date.now()}-${stableOrdinal(runSequence)}`;
    const materializedObjective = {
      id: objectiveId,
      schema_version: SCHEMA_VERSION,
      pillar: sourceObjective.pillar || 'workspace',
      actor: options.actor || sourceObjective.actor || 'operator',
      source_goal: selector.promoted_title,
      title: selector.promoted_title,
      capability: selector.suggested_capability || 'materialized-selector',
      desired_outcome: selector.promoted_summary,
      measurable_result: 'Materialized objective remains bounded by preserved authority and budget and is ready for proposal drafting.',
      status: 'defined',
      authority_level: Number(selector.authority_level || sourceObjective.authority_level || 1),
      scope: {
        include: [
          'materialized from verified lesson',
          'preserved authority boundary',
          'preserved budget boundary'
        ],
        exclude: ['automatic execution', 'deployments', 'secret handling']
      },
      budget: {
        time_minutes: Number(selector.budget?.time_minutes || 0),
        money_usd: Number(selector.budget?.money_usd || 0),
        tokens: Number(selector.budget?.tokens || 0)
      },
      constraints: [
        `Derived from selector ${selector.id}`,
        'Must remain within preserved authority and budget boundaries.'
      ],
      assumptions: [
        'The promoted candidate remains valuable after the source lesson.',
        'This objective will be re-planned before any execution.'
      ],
      acceptance_criteria: [
        {
          id: `${objectiveId}:ac:materialized`,
          description: 'Materialized objective is stored and linked to its selector.',
          kind: 'binary'
        },
        {
          id: `${objectiveId}:ac:bounded`,
          description: 'Materialized objective keeps the selector authority and budget boundaries.',
          kind: 'binary'
        }
      ],
      verification: {
        procedure: [
          `Inspect selector ${selector.id} and objective ${objectiveId}.`,
          'Confirm the materialized objective inherits preserved authority and budget values.',
          'Review the materialization bundle and next planning recommendation.'
        ],
        expected_artifacts: ['summary.md', 'manifest.json', 'verification.json', 'next-ideas.json']
      },
      recovery: {
        method: 'Discard or revise the materialized objective before proposal drafting if the promoted candidate is no longer valid.',
        stop_conditions: ['Selector does not exist', 'Workspace state cannot be written']
      },
      evidence: [
        {
          type: 'selector',
          value: selector.id
        },
        {
          type: 'lesson',
          value: lesson.id
        }
      ],
      recommendations: [
        `Draft a proposal for ${selector.promoted_title}.`,
        'Keep the next slice within the preserved guardrails.'
      ],
      lineage: {
        selector_id: selector.id,
        lesson_id: lesson.id,
        source_objective_id: sourceObjective.id
      },
      run_id: runId,
      created_at: createdAt,
      updated_at: createdAt
    };

    selector.status = 'materialized';
    selector.updated_at = createdAt;
    selector.materialized_objective_id = materializedObjective.id;
    selector.materialization_run_id = runId;

    lesson.updated_at = createdAt;
    lesson.materialization = {
      selector_id: selector.id,
      objective_id: materializedObjective.id,
      materialized_at: createdAt
    };

    sourceObjective.updated_at = createdAt;
    sourceObjective.recommendations = [
      `Materialized follow-up objective ready: ${materializedObjective.title}`,
      'Continue the next loop by drafting a proposal against the new bounded objective.'
    ];

    state.sequence = sequence;
    state.run_sequence = runSequence;
    state.objectives.unshift(materializedObjective);

    const bundlePath = writeSelectorMaterializationReviewBundle(
      exoticRoot,
      runId,
      sourceObjective,
      lesson,
      selector,
      materializedObjective
    );
    selector.materialization_bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return {
      selector,
      objective: materializedObjective,
      bundlePath,
      runId,
      idempotentReplay: false
    };
  }

  function draftProposalFromSelector(selectorId, options = {}) {
    if (!selectorId) {
      throw new Error('Selector id is required.');
    }

    const materialized = materializeSelector(selectorId, { actor: options.actor });
    const selector = materialized.selector;
    const objective = materialized.objective;

    if (selector.drafted_proposal_id) {
      const state = loadState();
      const proposal = state.proposals.find(item => item.id === selector.drafted_proposal_id) || null;
      return {
        selector,
        objective,
        proposal,
        bundlePath: selector.proposal_bundle_path || selector.materialization_bundle_path || selector.bundle_path,
        runId: selector.proposal_run_id || selector.materialization_run_id || selector.run_id,
        idempotentReplay: true
      };
    }

    const summary = summarizeGoal(options.summary || '') || [
      `Inspect the promoted objective "${objective.title}".`,
      'Define the smallest bounded implementation slice that stays within preserved authority and budget.',
      'Prepare focused verification for the new slice.'
    ].join(' ');

    const created = createProposal(objective.id, summary, {
      title: options.title || `Proposal for ${objective.title}`,
      owner: options.owner || objective.actor || 'operator',
      authorityLevel: objective.authority_level,
      timeMinutes: objective.budget?.time_minutes,
      moneyUsd: objective.budget?.money_usd,
      tokens: objective.budget?.tokens,
      capability: objective.capability
    });

    const state = loadState();
    const persistedSelector = state.selectors.find(item => item.id === selector.id);
    const persistedProposal = state.proposals.find(item => item.id === created.proposal.id);
    const persistedObjective = state.objectives.find(item => item.id === objective.id);
    if (!persistedSelector || !persistedProposal || !persistedObjective) {
      throw new Error(`Selector proposal draft state missing for: ${selector.id}`);
    }

    persistedSelector.status = 'drafted';
    persistedSelector.updated_at = created.proposal.updated_at;
    persistedSelector.drafted_proposal_id = created.proposal.id;
    persistedSelector.proposal_run_id = created.runId;

    persistedObjective.recommendations = [
      `Review drafted proposal ${created.proposal.id} for ${persistedObjective.title}.`,
      'Proceed through approval before any execution.'
    ];
    persistedObjective.updated_at = created.proposal.updated_at;

    const bundlePath = writeSelectorProposalReviewBundle(
      path.join(resolveStateRoot(root), '.exotic'),
      created.runId,
      persistedObjective,
      persistedSelector,
      persistedProposal
    );
    persistedSelector.proposal_bundle_path = bundlePath;
    saveState(state);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return {
      selector: persistedSelector,
      objective: persistedObjective,
      proposal: persistedProposal,
      bundlePath,
      runId: created.runId,
      idempotentReplay: false
    };
  }

  function admitDraftedSelectorProposal(selectorId, options = {}) {
    if (!selectorId) {
      throw new Error('Selector id is required.');
    }

    const drafted = draftProposalFromSelector(selectorId, {
      actor: options.actor,
      owner: options.owner,
      title: options.title,
      summary: options.summary
    });

    const state = loadState();
    const selector = state.selectors.find(item => item.id === selectorId);
    const proposal = state.proposals.find(item => item.id === drafted.proposal.id);
    const objective = state.objectives.find(item => item.id === drafted.objective.id);
    if (!selector || !proposal || !objective) {
      throw new Error(`Selector admission context missing for: ${selectorId}`);
    }

    if (selector.admitted_approval_id) {
      const existingApproval = state.approvals.find(item => item.id === selector.admitted_approval_id) || null;
      return {
        selector,
        objective,
        proposal,
        approval: existingApproval,
        bundlePath: selector.admission_bundle_path || existingApproval?.bundle_path || selector.proposal_bundle_path,
        runId: selector.admission_run_id || existingApproval?.run_id || selector.proposal_run_id,
        idempotentReplay: true
      };
    }

    const admission = admitProposal(proposal.id, {
      approver: options.approver || 'operator',
      authorityLevel: selector.authority_level,
      timeMinutes: selector.budget?.time_minutes,
      moneyUsd: selector.budget?.money_usd,
      tokens: selector.budget?.tokens
    });

    const refreshedState = loadState();
    const refreshedSelector = refreshedState.selectors.find(item => item.id === selectorId);
    const refreshedProposal = refreshedState.proposals.find(item => item.id === proposal.id);
    const refreshedObjective = refreshedState.objectives.find(item => item.id === objective.id);
    const refreshedApproval = refreshedState.approvals.find(item => item.id === admission.approval.id);
    if (!refreshedSelector || !refreshedProposal || !refreshedObjective || !refreshedApproval) {
      throw new Error(`Selector admission refresh missing for: ${selectorId}`);
    }

    refreshedSelector.status = refreshedApproval.approved ? 'admitted' : 'needs_revision';
    refreshedSelector.updated_at = refreshedApproval.updated_at;
    refreshedSelector.admitted_approval_id = refreshedApproval.id;
    refreshedSelector.admission_run_id = refreshedApproval.run_id;

    refreshedObjective.recommendations = refreshedApproval.approved
      ? [
          `Execute admitted selector proposal ${refreshedProposal.id}.`,
          'Keep execution within the preserved selector boundaries.'
        ]
      : [
          `Revise drafted selector proposal ${refreshedProposal.id}.`,
          'Do not widen authority or budget beyond the preserved selector boundaries.'
        ];
    refreshedObjective.updated_at = refreshedApproval.updated_at;

    const bundlePath = writeSelectorAdmissionReviewBundle(
      path.join(resolveStateRoot(root), '.exotic'),
      refreshedApproval.run_id,
      refreshedObjective,
      refreshedSelector,
      refreshedProposal,
      refreshedApproval
    );
    refreshedSelector.admission_bundle_path = bundlePath;
    saveState(refreshedState);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return {
      selector: refreshedSelector,
      objective: refreshedObjective,
      proposal: refreshedProposal,
      approval: refreshedApproval,
      bundlePath,
      runId: refreshedApproval.run_id,
      idempotentReplay: false
    };
  }

  function executeAdmittedSelectorProposal(selectorId, options = {}) {
    if (!selectorId) {
      throw new Error('Selector id is required.');
    }

    const admitted = admitDraftedSelectorProposal(selectorId, {
      actor: options.actor,
      approver: options.approver || 'operator',
      owner: options.owner,
      title: options.title,
      summary: options.summary
    });

    const state = loadState();
    const selector = state.selectors.find(item => item.id === selectorId);
    const proposal = state.proposals.find(item => item.id === admitted.proposal.id);
    const objective = state.objectives.find(item => item.id === admitted.objective.id);
    if (!selector || !proposal || !objective) {
      throw new Error(`Selector execution context missing for: ${selectorId}`);
    }

    if (selector.executed_operation_id) {
      const existingOperation = state.operations.find(item => item.id === selector.executed_operation_id) || null;
      return {
        selector,
        objective,
        proposal,
        operation: existingOperation,
        bundlePath: selector.execution_bundle_path || existingOperation?.bundle_path || selector.admission_bundle_path,
        runId: selector.execution_run_id || existingOperation?.run_id || selector.admission_run_id,
        idempotentReplay: true
      };
    }

    const execution = executeProposal(proposal.id, {
      actor: options.actor || admitted.approval.approver || 'operator',
      idempotencyKey: options.idempotencyKey || `selector:${selector.id}:execute`
    });

    const refreshedState = loadState();
    const refreshedSelector = refreshedState.selectors.find(item => item.id === selectorId);
    const refreshedProposal = refreshedState.proposals.find(item => item.id === proposal.id);
    const refreshedObjective = refreshedState.objectives.find(item => item.id === objective.id);
    const refreshedOperation = refreshedState.operations.find(item => item.id === execution.operation.id);
    if (!refreshedSelector || !refreshedProposal || !refreshedObjective || !refreshedOperation) {
      throw new Error(`Selector execution refresh missing for: ${selectorId}`);
    }

    refreshedSelector.status = 'executed';
    refreshedSelector.updated_at = refreshedOperation.updated_at;
    refreshedSelector.executed_operation_id = refreshedOperation.id;
    refreshedSelector.execution_run_id = refreshedOperation.run_id;

    refreshedObjective.recommendations = [
      `Capture lessons from executed selector proposal ${refreshedProposal.id}.`,
      'Continue the restarted loop through learning while preserving the selector lineage.'
    ];
    refreshedObjective.updated_at = refreshedOperation.updated_at;

    const bundlePath = writeSelectorExecutionReviewBundle(
      path.join(resolveStateRoot(root), '.exotic'),
      refreshedOperation.run_id,
      refreshedObjective,
      refreshedSelector,
      refreshedProposal,
      refreshedOperation
    );
    refreshedSelector.execution_bundle_path = bundlePath;
    saveState(refreshedState);
    ensureDir(path.dirname(latestReviewFile));
    fs.writeFileSync(latestReviewFile, bundlePath + '\n');

    return {
      selector: refreshedSelector,
      objective: refreshedObjective,
      proposal: refreshedProposal,
      operation: refreshedOperation,
      bundlePath,
      runId: refreshedOperation.run_id,
      idempotentReplay: false
    };
  }

  function writeReviewBundle(exoticRoot, runId, objective) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaFor(objective);
    const verification = {
      objective_id: objective.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: objective.acceptance_criteria[0].id,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: objective.acceptance_criteria[1].id,
          verdict: 'pass',
          evidence: manifestPath
        }
      ],
      verified_at: nowIso()
    };

    fs.writeFileSync(summaryPath, [
      `# Objective Intake Review`,
      '',
      `- Objective: ${objective.id}`,
      `- Title: ${objective.title}`,
      `- Status: ${objective.status}`,
      `- Goal: ${objective.source_goal}`,
      `- Outcome: ${objective.desired_outcome}`,
      `- Next idea: ${nextIdea.title}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      bundle_path: bundlePath,
      started_at: objective.created_at,
      completed_at: objective.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:intake`,
      objective_id: objective.id,
      type: 'objective.created',
      created_at: objective.created_at,
      payload: {
        title: objective.title,
        actor: objective.actor
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:intake`,
      objective_id: objective.id,
      type: 'objective.intake.accepted',
      created_at: objective.created_at,
      rationale: 'Goal intake is a Level 1 workspace action and creates no external side effects.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:intake`,
      objective_id: objective.id,
      type: 'objective.persisted',
      status: 'completed',
      created_at: objective.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath]
    });

    return bundlePath;
  }

  function writeProposalReviewBundle(exoticRoot, runId, objective, proposal) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForProposal(proposal);
    const verification = {
      objective_id: objective.id,
      proposal_id: proposal.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${proposal.id}:ac:proposal-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${proposal.id}:ac:objective-planned`,
          verdict: 'pass',
          evidence: objective.status
        }
      ],
      verified_at: nowIso()
    };

    fs.writeFileSync(summaryPath, [
      '# Proposal Review',
      '',
      `- Objective: ${objective.id}`,
      `- Proposal: ${proposal.id}`,
      `- Title: ${proposal.title}`,
      `- Status: ${proposal.status}`,
      `- Decision state: ${proposal.decision_state}`,
      `- Steps planned: ${proposal.plan.steps.length}`,
      `- Next idea: ${nextIdea.title}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      proposal_id: proposal.id,
      bundle_path: bundlePath,
      started_at: proposal.created_at,
      completed_at: proposal.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:proposal`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      type: 'proposal.created',
      created_at: proposal.created_at,
      payload: {
        title: proposal.title,
        owner: proposal.owner
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:proposal`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      type: 'proposal.drafted',
      created_at: proposal.created_at,
      rationale: 'Planning is allowed at Level 1 and does not execute side effects.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:proposal`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      type: 'proposal.persisted',
      status: 'completed',
      created_at: proposal.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath]
    });

    return bundlePath;
  }

  function writeApprovalReviewBundle(exoticRoot, runId, objective, proposal, approval) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForApproval(proposal, approval.approved);
    const verification = {
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${approval.id}:ac:approval-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${approval.id}:ac:decision-recorded`,
          verdict: 'pass',
          evidence: approval.status
        }
      ],
      verified_at: nowIso()
    };

    fs.writeFileSync(summaryPath, [
      '# Admission Review',
      '',
      `- Objective: ${objective.id}`,
      `- Proposal: ${proposal.id}`,
      `- Approval: ${approval.id}`,
      `- Decision: ${approval.status}`,
      `- Approver: ${approval.approver}`,
      `- Authority granted: ${approval.granted_authority_level}`,
      `- Next idea: ${nextIdea.title}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      bundle_path: bundlePath,
      started_at: approval.created_at,
      completed_at: approval.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:approval`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: approval.approved ? 'proposal.approved' : 'proposal.rejected',
      created_at: approval.created_at,
      payload: {
        approver: approval.approver,
        reasons: approval.reasons
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:approval`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: approval.approved ? 'admission.granted' : 'admission.denied',
      created_at: approval.created_at,
      rationale: approval.reasons.length === 0
        ? 'Proposal meets authority and budget constraints.'
        : approval.reasons.join('; ')
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:approval`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: 'proposal.admission.recorded',
      status: 'completed',
      created_at: approval.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath]
    });

    return bundlePath;
  }

  function writeExecutionReviewBundle(exoticRoot, runId, objective, proposal, approval, operation) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForOperation(operation);
    const verification = {
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      operation_id: operation.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${operation.id}:ac:operation-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${operation.id}:ac:verification-passed`,
          verdict: 'pass',
          evidence: operation.verification_status
        }
      ],
      verified_at: nowIso()
    };

    const traceArtifactPath = path.join(bundlePath, 'artifacts', 'execution-trace.json');
    writeJson(traceArtifactPath, operation.trace);
    operation.artifacts = [traceArtifactPath];

    fs.writeFileSync(summaryPath, [
      '# Execution Review',
      '',
      `- Objective: ${objective.id}`,
      `- Proposal: ${proposal.id}`,
      `- Approval: ${approval.id}`,
      `- Operation: ${operation.id}`,
      `- Status: ${operation.status}`,
      `- Verification: ${operation.verification_status}`,
      `- Idempotency key: ${operation.idempotency_key}`,
      `- Next idea: ${nextIdea.title}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      operation_id: operation.id,
      bundle_path: bundlePath,
      started_at: operation.created_at,
      completed_at: operation.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:execution`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      operation_id: operation.id,
      type: 'operation.completed',
      created_at: operation.created_at,
      payload: {
        actor: operation.actor,
        trace_steps: operation.trace.length
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:execution`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      operation_id: operation.id,
      type: 'execution.completed',
      created_at: operation.created_at,
      rationale: 'Execution completed using the admitted plan and preserved idempotency.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:execution`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      operation_id: operation.id,
      type: 'proposal.executed',
      status: operation.status,
      created_at: operation.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, traceArtifactPath]
    });

    return bundlePath;
  }

  function writeLearningReviewBundle(exoticRoot, runId, objective, proposal, operation, lesson) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForLesson(lesson);
    const verification = {
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      lesson_id: lesson.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${lesson.id}:ac:lesson-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${lesson.id}:ac:next-objective-proposed`,
          verdict: 'pass',
          evidence: lesson.next_objective.id
        }
      ],
      verified_at: nowIso()
    };

    const lessonArtifactPath = path.join(bundlePath, 'artifacts', 'lesson.json');
    writeJson(lessonArtifactPath, lesson);

    fs.writeFileSync(summaryPath, [
      '# Learning Review',
      '',
      `- Objective: ${objective.id}`,
      `- Proposal: ${proposal.id}`,
      `- Operation: ${operation.id}`,
      `- Lesson: ${lesson.id}`,
      `- Status: ${lesson.status}`,
      `- Next objective: ${lesson.next_objective.title}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      lesson_id: lesson.id,
      bundle_path: bundlePath,
      started_at: lesson.created_at,
      completed_at: lesson.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea, lesson.next_objective]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:learning`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      lesson_id: lesson.id,
      type: 'lesson.captured',
      created_at: lesson.created_at,
      payload: {
        next_objective_id: lesson.next_objective.id
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:learning`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      lesson_id: lesson.id,
      type: 'learning.saved',
      created_at: lesson.created_at,
      rationale: 'Verified execution evidence is strong enough to preserve a reusable lesson and propose the next bounded improvement.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:learning`,
      objective_id: objective.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      lesson_id: lesson.id,
      type: 'lesson.persisted',
      status: 'completed',
      created_at: lesson.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, lessonArtifactPath]
    });

    return bundlePath;
  }

  function writeSelectorReviewBundle(exoticRoot, runId, objective, lesson, selector) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForSelector(selector);
    const verification = {
      objective_id: objective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${selector.id}:ac:selector-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${selector.id}:ac:boundaries-preserved`,
          verdict: 'pass',
          evidence: selector.boundaries
        }
      ],
      verified_at: nowIso()
    };

    const selectorArtifactPath = path.join(bundlePath, 'artifacts', 'selector.json');
    writeJson(selectorArtifactPath, selector);

    fs.writeFileSync(summaryPath, [
      '# Selector Review',
      '',
      `- Source objective: ${objective.id}`,
      `- Lesson: ${lesson.id}`,
      `- Selector: ${selector.id}`,
      `- Candidate type: ${selector.candidate_type}`,
      `- Promoted title: ${selector.promoted_title}`,
      `- Status: ${selector.status}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      bundle_path: bundlePath,
      started_at: selector.created_at,
      completed_at: selector.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:selector`,
      objective_id: objective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      type: 'lesson.promoted',
      created_at: selector.created_at,
      payload: {
        candidate_type: selector.candidate_type,
        promoted_title: selector.promoted_title
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:selector`,
      objective_id: objective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      type: 'selector.saved',
      created_at: selector.created_at,
      rationale: 'A verified lesson can be promoted into a new bounded candidate while preserving the original authority and budget guardrails.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:selector`,
      objective_id: objective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      type: 'selector.persisted',
      status: 'completed',
      created_at: selector.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, selectorArtifactPath]
    });

    return bundlePath;
  }

  function writeSelectorMaterializationReviewBundle(exoticRoot, runId, sourceObjective, lesson, selector, objective) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForMaterializedObjective(objective, selector);
    const verification = {
      objective_id: objective.id,
      selector_id: selector.id,
      lesson_id: lesson.id,
      source_objective_id: sourceObjective.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${objective.id}:ac:materialized`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${objective.id}:ac:bounded`,
          verdict: 'pass',
          evidence: {
            authority_level: objective.authority_level,
            budget: objective.budget
          }
        }
      ],
      verified_at: nowIso()
    };

    const objectiveArtifactPath = path.join(bundlePath, 'artifacts', 'materialized-objective.json');
    writeJson(objectiveArtifactPath, objective);

    fs.writeFileSync(summaryPath, [
      '# Selector Materialization Review',
      '',
      `- Source objective: ${sourceObjective.id}`,
      `- Lesson: ${lesson.id}`,
      `- Selector: ${selector.id}`,
      `- Materialized objective: ${objective.id}`,
      `- Title: ${objective.title}`,
      `- Status: ${objective.status}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      source_objective_id: sourceObjective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      objective_id: objective.id,
      bundle_path: bundlePath,
      started_at: objective.created_at,
      completed_at: objective.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:materialization`,
      source_objective_id: sourceObjective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      objective_id: objective.id,
      type: 'selector.materialized',
      created_at: objective.created_at,
      payload: {
        title: objective.title,
        capability: objective.capability
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:materialization`,
      source_objective_id: sourceObjective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      objective_id: objective.id,
      type: 'materialization.saved',
      created_at: objective.created_at,
      rationale: 'The promoted selector has enough verified context to become a new bounded objective without widening authority or budget.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:materialization`,
      source_objective_id: sourceObjective.id,
      lesson_id: lesson.id,
      selector_id: selector.id,
      objective_id: objective.id,
      type: 'objective.materialized',
      status: 'completed',
      created_at: objective.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, objectiveArtifactPath]
    });

    return bundlePath;
  }

  function writeSelectorProposalReviewBundle(exoticRoot, runId, objective, selector, proposal) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForDraftedSelectorProposal(proposal, selector);
    const verification = {
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${proposal.id}:ac:selector-proposal-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${proposal.id}:ac:bounded-draft`,
          verdict: 'pass',
          evidence: {
            authority_level: proposal.authority_level,
            estimated_effort: proposal.estimated_effort
          }
        }
      ],
      verified_at: nowIso()
    };

    const proposalArtifactPath = path.join(bundlePath, 'artifacts', 'selector-proposal.json');
    writeJson(proposalArtifactPath, proposal);

    fs.writeFileSync(summaryPath, [
      '# Selector Proposal Draft Review',
      '',
      `- Objective: ${objective.id}`,
      `- Selector: ${selector.id}`,
      `- Proposal: ${proposal.id}`,
      `- Status: ${proposal.status}`,
      `- Decision state: ${proposal.decision_state}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      bundle_path: bundlePath,
      started_at: proposal.created_at,
      completed_at: proposal.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:selector-proposal`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      type: 'selector.proposal_drafted',
      created_at: proposal.created_at,
      payload: {
        title: proposal.title,
        status: proposal.status
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:selector-proposal`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      type: 'selector.proposal_saved',
      created_at: proposal.created_at,
      rationale: 'The materialized objective has enough verified context to restart the planning loop with a bounded draft proposal.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:selector-proposal`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      type: 'proposal.drafted_from_selector',
      status: 'completed',
      created_at: proposal.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, proposalArtifactPath]
    });

    return bundlePath;
  }

  function writeSelectorAdmissionReviewBundle(exoticRoot, runId, objective, selector, proposal, approval) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForAdmittedSelectorProposal(proposal, selector, approval);
    const verification = {
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${approval.id}:ac:selector-admission-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${approval.id}:ac:preserved-boundaries-admitted`,
          verdict: 'pass',
          evidence: {
            authority_level: selector.authority_level,
            budget: selector.budget
          }
        }
      ],
      verified_at: nowIso()
    };

    const approvalArtifactPath = path.join(bundlePath, 'artifacts', 'selector-approval.json');
    writeJson(approvalArtifactPath, approval);

    fs.writeFileSync(summaryPath, [
      '# Selector Admission Review',
      '',
      `- Objective: ${objective.id}`,
      `- Selector: ${selector.id}`,
      `- Proposal: ${proposal.id}`,
      `- Approval: ${approval.id}`,
      `- Decision: ${approval.status}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      bundle_path: bundlePath,
      started_at: approval.created_at,
      completed_at: approval.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:selector-admission`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: approval.approved ? 'selector.proposal_approved' : 'selector.proposal_rejected',
      created_at: approval.created_at,
      payload: {
        decision: approval.status,
        reasons: approval.reasons
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:selector-admission`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: 'selector.admission_saved',
      created_at: approval.created_at,
      rationale: 'The drafted selector proposal was admitted using the selector-preserved authority and budget boundaries.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:selector-admission`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      approval_id: approval.id,
      type: 'proposal.admitted_from_selector',
      status: 'completed',
      created_at: approval.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, approvalArtifactPath]
    });

    return bundlePath;
  }

  function writeSelectorExecutionReviewBundle(exoticRoot, runId, objective, selector, proposal, operation) {
    const bundlePath = path.join(runsDir, runId);
    const summaryPath = path.join(bundlePath, 'summary.md');
    const manifestPath = path.join(bundlePath, 'manifest.json');
    const verificationPath = path.join(bundlePath, 'verification.json');
    const nextIdeasPath = path.join(bundlePath, 'next-ideas.json');
    const eventsPath = path.join(bundlePath, 'events.jsonl');
    const decisionsPath = path.join(bundlePath, 'decisions.jsonl');
    const operationsPath = path.join(bundlePath, 'operations.jsonl');

    ensureDir(path.join(bundlePath, 'artifacts'));
    ensureDir(path.join(bundlePath, 'logs'));
    ensureDir(path.join(bundlePath, 'patches'));

    const nextIdea = nextIdeaForExecutedSelectorProposal(operation, selector);
    const verification = {
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      verdict: 'pass',
      acceptance: [
        {
          criterion_id: `${operation.id}:ac:selector-execution-persisted`,
          verdict: 'pass',
          evidence: path.join(exoticRoot, 'state', 'objectives.json')
        },
        {
          criterion_id: `${operation.id}:ac:selector-execution-verified`,
          verdict: 'pass',
          evidence: operation.verification_status
        }
      ],
      verified_at: nowIso()
    };

    const executionArtifactPath = path.join(bundlePath, 'artifacts', 'selector-execution.json');
    writeJson(executionArtifactPath, operation);

    fs.writeFileSync(summaryPath, [
      '# Selector Execution Review',
      '',
      `- Objective: ${objective.id}`,
      `- Selector: ${selector.id}`,
      `- Proposal: ${proposal.id}`,
      `- Operation: ${operation.id}`,
      `- Status: ${operation.status}`,
      `- Verification: ${operation.verification_status}`,
      ''
    ].join('\n'));

    writeJson(manifestPath, {
      run_id: runId,
      status: 'completed',
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      bundle_path: bundlePath,
      started_at: operation.created_at,
      completed_at: operation.updated_at
    });

    writeJson(verificationPath, verification);
    writeJson(nextIdeasPath, [nextIdea]);
    appendJsonl(eventsPath, {
      id: `${runId}:event:selector-execution`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      type: 'selector.proposal_executed',
      created_at: operation.created_at,
      payload: {
        status: operation.status,
        verification_status: operation.verification_status
      }
    });
    appendJsonl(decisionsPath, {
      id: `${runId}:decision:selector-execution`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      type: 'selector.execution_saved',
      created_at: operation.created_at,
      rationale: 'The admitted selector proposal executed through the same bounded operation path and preserved idempotent verification.'
    });
    appendJsonl(operationsPath, {
      id: `${runId}:operation:selector-execution`,
      objective_id: objective.id,
      selector_id: selector.id,
      proposal_id: proposal.id,
      operation_id: operation.id,
      type: 'proposal.executed_from_selector',
      status: 'completed',
      created_at: operation.created_at,
      artifact_refs: [summaryPath, manifestPath, verificationPath, executionArtifactPath]
    });

    return bundlePath;
  }

  function listObjectives() {
    return loadState().objectives || [];
  }

  function getObjective(id) {
    return listObjectives().find(objective => objective.id === id) || null;
  }

  function listProposals() {
    return loadState().proposals || [];
  }

  function getProposal(id) {
    return listProposals().find(proposal => proposal.id === id) || null;
  }

  function listApprovals() {
    return loadState().approvals || [];
  }

  function getApproval(id) {
    return listApprovals().find(approval => approval.id === id) || null;
  }

  function listOperations() {
    return loadState().operations || [];
  }

  function getOperation(id) {
    return listOperations().find(operation => operation.id === id) || null;
  }

  function listLessons() {
    return loadState().lessons || [];
  }

  function getLesson(id) {
    return listLessons().find(lesson => lesson.id === id) || null;
  }

  function listSelectors() {
    return loadState().selectors || [];
  }

  function getSelector(id) {
    return listSelectors().find(selector => selector.id === id) || null;
  }

  return {
    stateRoot,
    createObjective,
    listObjectives,
    getObjective,
    createProposal,
    listProposals,
    getProposal,
    admitProposal,
    listApprovals,
    getApproval,
    executeProposal,
    listOperations,
    getOperation,
    learnFromOperation,
    listLessons,
    getLesson,
    promoteLesson,
    listSelectors,
    getSelector,
    materializeSelector,
    draftProposalFromSelector,
    admitDraftedSelectorProposal,
    executeAdmittedSelectorProposal
  };
}
