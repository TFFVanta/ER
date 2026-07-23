#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { createObjectiveStore } from './objectives.js';

const args = process.argv.slice(2);
const nl = String.fromCharCode(10);

function findRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'packages'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const root = findRoot(process.cwd());

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function cleanName(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/^@exotic\//, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
}

function packageNames() {
  const dir = path.join(root, 'packages');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => fs.statSync(path.join(dir, name)).isDirectory())
    .sort();
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseFlags(argv) {
  const values = {};
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      values[key] = true;
      continue;
    }
    values[key] = next;
    i += 1;
  }

  return { values, rest };
}

function createPackage(input) {
  const name = cleanName(input);
  if (!name) {
    console.error('Missing package name.');
    process.exit(1);
  }

  const dir = path.join(root, 'packages', name);
  if (fs.existsSync(dir)) {
    console.error('Package already exists: packages/' + name);
    process.exit(1);
  }

  for (const folder of ['src', 'tests', 'docs', 'examples', 'benchmarks']) {
    fs.mkdirSync(path.join(dir, folder), { recursive: true });
  }

  write(path.join(dir, 'README.md'), [
    '# @exotic/' + name,
    '',
    'Everything Is Exotic.',
    ''
  ].join(nl));

  write(path.join(dir, 'package.json'), JSON.stringify({
    name: '@exotic/' + name,
    version: '0.1.0',
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc -p tsconfig.json',
      test: 'vitest run'
    }
  }, null, 2));

  write(path.join(dir, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      rootDir: 'src',
      outDir: 'dist'
    },
    include: ['src/**/*.ts']
  }, null, 2));

  write(path.join(dir, 'src', 'index.ts'), [
    'export const identity = {',
    '  name: "@exotic/' + name + '",',
    '  tagline: "Everything Is Exotic."',
    '};',
    ''
  ].join(nl));

  console.log('✓ Package created: @exotic/' + name);
}

function listPackages() {
  const names = packageNames();
  console.log('EXOTIC packages (' + names.length + ')');
  for (const name of names) {
    console.log('  - @exotic/' + name);
  }
}

function doctor() {
  const rootPkgPath = path.join(root, 'package.json');
  const rootPkg = fs.existsSync(rootPkgPath) ? readJson(rootPkgPath) : {};
  const names = packageNames();
  const issues = [];

  if (!rootPkg.private) issues.push('Root package.json should be private=true.');
  if (!rootPkg.packageManager) issues.push('Root package.json is missing packageManager.');
  if (!Array.isArray(rootPkg.workspaces)) issues.push('Root package.json is missing workspaces array.');

  for (const name of names) {
    const dir = path.join(root, 'packages', name);
    const pkgPath = path.join(dir, 'package.json');
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    const srcPath = path.join(dir, 'src', 'index.ts');

    if (!fs.existsSync(pkgPath)) issues.push('@exotic/' + name + ' missing package.json.');
    if (!fs.existsSync(tsconfigPath)) issues.push('@exotic/' + name + ' missing tsconfig.json.');
    if (!fs.existsSync(srcPath)) issues.push('@exotic/' + name + ' missing src/index.ts.');

    if (fs.existsSync(pkgPath)) {
      const pkg = readJson(pkgPath);
      if (pkg.name !== '@exotic/' + name) issues.push('@exotic/' + name + ' package name mismatch.');
      if (!pkg.scripts || !pkg.scripts.build) issues.push('@exotic/' + name + ' missing build script.');
    }
  }

  console.log('EXOTIC Doctor');
  console.log('Root: ' + root);
  console.log('Packages: ' + names.length);
  console.log('Package manager: ' + (rootPkg.packageManager || 'missing'));
  console.log('');

  if (issues.length === 0) {
    console.log('✓ System healthy.');
  } else {
    console.log('Issues:');
    for (const issue of issues) console.log('  - ' + issue);
    process.exitCode = 1;
  }
}

function build() {
  cp.execSync('npm run build', { cwd: root, stdio: 'inherit' });
}

function objectiveHelp() {
  console.log([
    'Objective Commands:',
    '  objective create <goal text>',
    '  objective list',
    '  objective inspect <objective-id>',
    '  proposal create <objective-id> [summary]',
    '  proposal list',
    '  proposal inspect <proposal-id>',
    '  proposal admit <proposal-id> [--approver <name>] [--authority <level>]',
    '  proposal execute <proposal-id> [--idempotency-key <key>]',
    '  operation learn <operation-id> [--summary <text>]',
    '  approval list',
    '  approval inspect <approval-id>',
    '  operation list',
    '  operation inspect <operation-id>',
    '  lesson list',
    '  lesson inspect <lesson-id>',
    '  lesson promote <lesson-id> [--type objective]',
    '  selector list',
    '  selector inspect <selector-id>',
    '  selector materialize <selector-id>',
    '  selector draft-proposal <selector-id>',
    '  selector admit-proposal <selector-id>',
    '  selector execute-proposal <selector-id>',
    '  selector learn-execution <selector-id>',
    ''
  ].join(nl));
}

function objectiveCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { values, rest } = parseFlags(argv.slice(2));

  if (subcommand === 'create') {
    const goal = values.goal || rest.join(' ').trim();
    if (!goal) {
      console.error('Missing goal text. Usage: exo objective create <goal text>');
      process.exit(1);
    }

    const result = store.createObjective(goal, {
      actor: values.actor,
      pillar: values.pillar,
      capability: values.capability,
      authorityLevel: values.authority,
      timeMinutes: values['time-minutes'],
      moneyUsd: values['money-usd'],
      tokens: values.tokens
    });

    console.log(`Created objective ${result.objective.id}`);
    console.log(`Title: ${result.objective.title}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'list') {
    const objectives = store.listObjectives().map(objective => ({
      id: objective.id,
      title: objective.title,
      status: objective.status,
      authority_level: objective.authority_level,
      created_at: objective.created_at
    }));
    printJson(objectives);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing objective id. Usage: exo objective inspect <objective-id>');
      process.exit(1);
    }
    const objective = store.getObjective(id);
    if (!objective) {
      console.error(`Objective not found: ${id}`);
      process.exit(1);
    }
    printJson(objective);
    return;
  }

  objectiveHelp();
}

function proposalCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { values, rest } = parseFlags(argv.slice(2));

  if (subcommand === 'create') {
    const objectiveId = rest[0];
    const summary = values.summary || rest.slice(1).join(' ').trim();
    if (!objectiveId) {
      console.error('Missing objective id. Usage: exo proposal create <objective-id> [summary]');
      process.exit(1);
    }

    const result = store.createProposal(objectiveId, summary, {
      title: values.title,
      owner: values.owner,
      authorityLevel: values.authority,
      timeMinutes: values['time-minutes'],
      moneyUsd: values['money-usd'],
      tokens: values.tokens,
      value: values.value,
      confidence: values.confidence,
      readiness: values.readiness,
      risk: values.risk
    });

    console.log(`Created proposal ${result.proposal.id}`);
    console.log(`Objective: ${result.objective.id}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'list') {
    const proposals = store.listProposals().map(proposal => ({
      id: proposal.id,
      objective_id: proposal.objective_id,
      title: proposal.title,
      status: proposal.status,
      decision_state: proposal.decision_state,
      created_at: proposal.created_at
    }));
    printJson(proposals);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing proposal id. Usage: exo proposal inspect <proposal-id>');
      process.exit(1);
    }
    const proposal = store.getProposal(id);
    if (!proposal) {
      console.error(`Proposal not found: ${id}`);
      process.exit(1);
    }
    printJson(proposal);
    return;
  }

  if (subcommand === 'admit') {
    const id = rest[0];
    if (!id) {
      console.error('Missing proposal id. Usage: exo proposal admit <proposal-id> [--approver <name>] [--authority <level>]');
      process.exit(1);
    }

    const result = store.admitProposal(id, {
      approver: values.approver,
      authorityLevel: values.authority,
      timeMinutes: values['time-minutes'],
      moneyUsd: values['money-usd'],
      tokens: values.tokens
    });

    console.log(`Recorded approval ${result.approval.id}`);
    console.log(`Proposal: ${result.proposal.id}`);
    console.log(`Decision: ${result.approval.status}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'execute') {
    const id = rest[0];
    if (!id) {
      console.error('Missing proposal id. Usage: exo proposal execute <proposal-id> [--idempotency-key <key>]');
      process.exit(1);
    }

    const result = store.executeProposal(id, {
      actor: values.actor,
      idempotencyKey: values['idempotency-key']
    });

    console.log(`${result.idempotentReplay ? 'Reused operation' : 'Created operation'} ${result.operation.id}`);
    console.log(`Proposal: ${result.proposal.id}`);
    console.log(`Verification: ${result.operation.verification_status}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  objectiveHelp();
}

function approvalCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { rest } = parseFlags(argv.slice(2));

  if (subcommand === 'list') {
    const approvals = store.listApprovals().map(approval => ({
      id: approval.id,
      proposal_id: approval.proposal_id,
      approver: approval.approver,
      status: approval.status,
      approved: approval.approved,
      created_at: approval.created_at
    }));
    printJson(approvals);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing approval id. Usage: exo approval inspect <approval-id>');
      process.exit(1);
    }
    const approval = store.getApproval(id);
    if (!approval) {
      console.error(`Approval not found: ${id}`);
      process.exit(1);
    }
    printJson(approval);
    return;
  }

  objectiveHelp();
}

function operationCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { values, rest } = parseFlags(argv.slice(2));

  if (subcommand === 'list') {
    const operations = store.listOperations().map(operation => ({
      id: operation.id,
      proposal_id: operation.proposal_id,
      status: operation.status,
      verification_status: operation.verification_status,
      idempotency_key: operation.idempotency_key,
      created_at: operation.created_at
    }));
    printJson(operations);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing operation id. Usage: exo operation inspect <operation-id>');
      process.exit(1);
    }
    const operation = store.getOperation(id);
    if (!operation) {
      console.error(`Operation not found: ${id}`);
      process.exit(1);
    }
    printJson(operation);
    return;
  }

  if (subcommand === 'learn') {
    const id = rest[0];
    if (!id) {
      console.error('Missing operation id. Usage: exo operation learn <operation-id> [--summary <text>]');
      process.exit(1);
    }
    const result = store.learnFromOperation(id, {
      summary: values.summary
    });
    console.log(`${result.idempotentReplay ? 'Reused lesson' : 'Captured lesson'} ${result.lesson.id}`);
    console.log(`Operation: ${result.operation.id}`);
    console.log(`Next objective: ${result.lesson.next_objective.title}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  objectiveHelp();
}

function lessonCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { values, rest } = parseFlags(argv.slice(2));

  if (subcommand === 'list') {
    const lessons = store.listLessons().map(lesson => ({
      id: lesson.id,
      operation_id: lesson.operation_id,
      status: lesson.status,
      next_objective_id: lesson.next_objective?.id,
      created_at: lesson.created_at
    }));
    printJson(lessons);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing lesson id. Usage: exo lesson inspect <lesson-id>');
      process.exit(1);
    }
    const lesson = store.getLesson(id);
    if (!lesson) {
      console.error(`Lesson not found: ${id}`);
      process.exit(1);
    }
    printJson(lesson);
    return;
  }

  if (subcommand === 'promote') {
    const id = rest[0];
    if (!id) {
      console.error('Missing lesson id. Usage: exo lesson promote <lesson-id> [--type objective]');
      process.exit(1);
    }
    const result = store.promoteLesson(id, {
      type: values.type,
      title: values.title,
      authorityLevel: values.authority,
      timeMinutes: values['time-minutes'],
      moneyUsd: values['money-usd'],
      tokens: values.tokens
    });
    console.log(`${result.idempotentReplay ? 'Reused selector' : 'Created selector'} ${result.selector.id}`);
    console.log(`Lesson: ${result.lesson.id}`);
    console.log(`Candidate: ${result.selector.promoted_title}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  objectiveHelp();
}

function selectorCommand(argv) {
  const store = createObjectiveStore(root);
  const subcommand = argv[1];
  const { values, rest } = parseFlags(argv.slice(2));

  if (subcommand === 'list') {
    const selectors = store.listSelectors().map(selector => ({
      id: selector.id,
      lesson_id: selector.lesson_id,
      candidate_type: selector.candidate_type,
      promoted_title: selector.promoted_title,
      status: selector.status,
      created_at: selector.created_at
    }));
    printJson(selectors);
    return;
  }

  if (subcommand === 'inspect') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector inspect <selector-id>');
      process.exit(1);
    }
    const selector = store.getSelector(id);
    if (!selector) {
      console.error(`Selector not found: ${id}`);
      process.exit(1);
    }
    printJson(selector);
    return;
  }

  if (subcommand === 'materialize') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector materialize <selector-id>');
      process.exit(1);
    }
    const result = store.materializeSelector(id, {
      actor: values.actor
    });
    console.log(`${result.idempotentReplay ? 'Reused objective' : 'Materialized objective'} ${result.objective.id}`);
    console.log(`Selector: ${result.selector.id}`);
    console.log(`Title: ${result.objective.title}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'draft-proposal') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector draft-proposal <selector-id>');
      process.exit(1);
    }
    const result = store.draftProposalFromSelector(id, {
      actor: values.actor,
      owner: values.owner,
      title: values.title,
      summary: values.summary
    });
    console.log(`${result.idempotentReplay ? 'Reused proposal' : 'Drafted proposal'} ${result.proposal.id}`);
    console.log(`Selector: ${result.selector.id}`);
    console.log(`Objective: ${result.objective.id}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'admit-proposal') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector admit-proposal <selector-id>');
      process.exit(1);
    }
    const result = store.admitDraftedSelectorProposal(id, {
      actor: values.actor,
      approver: values.approver || 'operator',
      owner: values.owner,
      title: values.title,
      summary: values.summary
    });
    console.log(`${result.idempotentReplay ? 'Reused approval' : 'Admitted proposal'} ${result.approval.id}`);
    console.log(`Selector: ${result.selector.id}`);
    console.log(`Proposal: ${result.proposal.id}`);
    console.log(`Decision: ${result.approval.status}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'execute-proposal') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector execute-proposal <selector-id>');
      process.exit(1);
    }
    const result = store.executeAdmittedSelectorProposal(id, {
      actor: values.actor,
      approver: values.approver || 'operator',
      owner: values.owner,
      title: values.title,
      summary: values.summary,
      idempotencyKey: values['idempotency-key']
    });
    console.log(`${result.idempotentReplay ? 'Reused operation' : 'Executed proposal'} ${result.operation.id}`);
    console.log(`Selector: ${result.selector.id}`);
    console.log(`Proposal: ${result.proposal.id}`);
    console.log(`Verification: ${result.operation.verification_status}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  if (subcommand === 'learn-execution') {
    const id = rest[0];
    if (!id) {
      console.error('Missing selector id. Usage: exo selector learn-execution <selector-id>');
      process.exit(1);
    }
    const result = store.learnFromSelectorExecution(id, {
      actor: values.actor,
      approver: values.approver || 'operator',
      owner: values.owner,
      title: values.title,
      summary: values.summary,
      idempotencyKey: values['idempotency-key']
    });
    console.log(`${result.idempotentReplay ? 'Reused lesson' : 'Learned execution'} ${result.lesson.id}`);
    console.log(`Selector: ${result.selector.id}`);
    console.log(`Operation: ${result.operation.id}`);
    console.log(`Next objective: ${result.lesson.next_objective.title}`);
    console.log(`Run: ${result.runId}`);
    console.log(`Bundle: ${result.bundlePath}`);
    return;
  }

  objectiveHelp();
}

function help() {
  console.log([
    'EXOTIC',
    'Everything Is Exotic.',
    '',
    'Commands:',
    '  doctor',
    '  list packages',
    '  objective create <goal text>',
    '  objective list',
    '  objective inspect <objective-id>',
    '  proposal create <objective-id> [summary]',
    '  proposal list',
    '  proposal inspect <proposal-id>',
    '  proposal admit <proposal-id> [--approver <name>] [--authority <level>]',
    '  proposal execute <proposal-id> [--idempotency-key <key>]',
    '  operation learn <operation-id> [--summary <text>]',
    '  approval list',
    '  approval inspect <approval-id>',
    '  operation list',
    '  operation inspect <operation-id>',
    '  lesson list',
    '  lesson inspect <lesson-id>',
    '  lesson promote <lesson-id> [--type objective]',
    '  selector list',
    '  selector inspect <selector-id>',
    '  selector materialize <selector-id>',
    '  selector draft-proposal <selector-id>',
    '  selector admit-proposal <selector-id>',
    '  selector execute-proposal <selector-id>',
    '  selector learn-execution <selector-id>',
    '  new package <name>',
    '  build',
    '  help',
    ''
  ].join(nl));
}

if (args[0] === 'doctor') {
  doctor();
} else if (args[0] === 'list' && args[1] === 'packages') {
  listPackages();
} else if (args[0] === 'objective') {
  objectiveCommand(args);
} else if (args[0] === 'proposal') {
  proposalCommand(args);
} else if (args[0] === 'approval') {
  approvalCommand(args);
} else if (args[0] === 'operation') {
  operationCommand(args);
} else if (args[0] === 'lesson') {
  lessonCommand(args);
} else if (args[0] === 'selector') {
  selectorCommand(args);
} else if (args[0] === 'new' && args[1] === 'package') {
  createPackage(args[2]);
} else if (args[0] === 'build') {
  build();
} else {
  help();
}
