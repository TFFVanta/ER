#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createObjectiveStore } from './objectives.js';
import { runHarmonyCheck } from './harmony.js';
import { listBlueprints, blueprintFiles } from './blueprints.js';

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

function bridgeRoot() {
  return process.env.EXOTIC_BRIDGE_ROOT || path.join(root, '.exotic', 'codex-bridge');
}

function readRoadmapFile() {
  const file = path.join(bridgeRoot(), 'roadmap.json');
  if (!fs.existsSync(file)) return [];
  return readJson(file);
}

// Loads a built workspace package straight from its dist output via an absolute file:
// URL, matching the same pattern codex-bridge-runtime.mjs uses (see that file's imports).
// A bare `import '@exotic/workflow'` would resolve to that package's "main": "src/index.ts",
// which plain Node ESM can't load directly - only tools like tsx/vitest transpile on the fly.
async function loadWorkspacePackage(name) {
  const distEntry = path.join(root, 'packages', name, 'dist', 'index.js');
  if (!fs.existsSync(distEntry)) {
    console.error(`packages/${name} has not been built. Run "npm run build" first.`);
    process.exit(1);
  }
  return import(pathToFileURL(distEntry).href);
}

function patternHelp() {
  console.log([
    'Pattern Commands:',
    '  pattern list',
    '  pattern show <name>',
    '  pattern apply <name> [--force]',
    ''
  ].join(nl));
}

async function patternCommand(argv) {
  const subcommand = argv[1];
  const { values } = parseFlags(argv.slice(2));
  const { roadmapPatterns, findPattern, composeRoadmap } = await loadWorkspacePackage('pattern-composer');

  if (subcommand === 'list') {
    for (const pattern of roadmapPatterns) {
      console.log(`${pattern.name}  (${pattern.steps.length} steps)  ${pattern.description}`);
    }
    return;
  }

  if (subcommand === 'show') {
    const name = argv[2];
    const pattern = findPattern(name);
    if (!pattern) {
      console.error(`Unknown pattern: ${name}`);
      process.exit(1);
    }
    console.log(`${pattern.name} - ${pattern.description}`);
    console.log('');
    for (const step of pattern.steps) {
      console.log(`${step.id}  [${step.lane}]  ${step.title}  (depends on: ${step.dependsOn.join(', ') || 'none'})`);
    }
    return;
  }

  if (subcommand === 'apply') {
    const name = argv[2];
    if (!name) {
      console.error('Missing pattern name. Usage: exo pattern apply <name> [--force]');
      process.exit(1);
    }
    const roadmapFile = path.join(bridgeRoot(), 'roadmap.json');
    if (fs.existsSync(roadmapFile) && !values.force) {
      console.error(
        `${roadmapFile} already exists. Pass --force to overwrite it - this discards any in-progress roadmap state.`
      );
      process.exit(1);
    }
    const roadmap = composeRoadmap(name);
    fs.mkdirSync(bridgeRoot(), { recursive: true });
    fs.writeFileSync(roadmapFile, JSON.stringify(roadmap, null, 2));
    console.log(`Wrote ${roadmap.length} steps from pattern "${name}" to ${roadmapFile}`);
    return;
  }

  patternHelp();
}

function blueprintHelp() {
  console.log([
    'Blueprint Commands:',
    '  blueprint list',
    '  blueprint show <name>',
    '  blueprint apply <name> <package-name>',
    ''
  ].join(nl));
}

function blueprintCommand(argv) {
  const subcommand = argv[1];

  if (subcommand === 'list') {
    for (const blueprint of listBlueprints()) {
      console.log(`${blueprint.name}  -  ${blueprint.describe}`);
    }
    return;
  }

  if (subcommand === 'show') {
    const name = argv[2];
    const blueprint = listBlueprints().find((item) => item.name === name);
    if (!blueprint) {
      console.error(`Unknown blueprint: ${name}. Run "exo blueprint list" to see available blueprints.`);
      process.exit(1);
    }
    console.log(`${blueprint.name} - ${blueprint.describe}`);
    console.log('');
    for (const file of blueprintFiles(name, 'example-package-name')) {
      console.log(`  ${file.path}`);
    }
    return;
  }

  if (subcommand === 'apply') {
    const blueprintName = argv[2];
    const packageName = cleanName(argv[3]);
    if (!blueprintName || !packageName) {
      console.error('Usage: exo blueprint apply <name> <package-name>');
      process.exit(1);
    }
    const dir = path.join(root, 'packages', packageName);
    if (fs.existsSync(dir)) {
      console.error('Package already exists: packages/' + packageName);
      process.exit(1);
    }
    let files;
    try {
      files = blueprintFiles(blueprintName, packageName);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    for (const file of files) {
      write(path.join(dir, file.path), file.content);
    }
    console.log(`Wrote ${files.length} files from blueprint "${blueprintName}" to packages/${packageName}`);
    return;
  }

  blueprintHelp();
}

function harmonyHelp() {
  console.log([
    'Harmony Commands:',
    '  harmony check',
    ''
  ].join(nl));
}

async function harmonyCommand(argv) {
  const subcommand = argv[1] || 'check';
  if (subcommand !== 'check') {
    harmonyHelp();
    return;
  }

  const [{ ventureWorkspaceContract }, { slugify }] = await Promise.all([
    loadWorkspacePackage('contracts'),
    loadWorkspacePackage('entity'),
  ]);
  const findings = runHarmonyCheck({
    bridgeRoot: bridgeRoot(),
    workspaceRoot: path.join(bridgeRoot(), '..', 'workspaces'),
    ventureWorkspaceContract,
    slugify,
  });

  let hasError = false;
  for (const item of findings) {
    const prefix = item.level === 'error' ? 'ERROR' : item.level === 'warn' ? 'WARN' : 'OK';
    console.log(`[${prefix}] ${item.message}`);
    if (item.level === 'error') hasError = true;
  }
  if (hasError) process.exit(1);
}

function companyHelp() {
  console.log([
    'Company Commands:',
    '  company status [--json]',
    ''
  ].join(nl));
}

async function companyCommand(argv) {
  const subcommand = argv[1] || 'status';
  if (subcommand !== 'status') {
    companyHelp();
    return;
  }
  const { values } = parseFlags(argv.slice(2));

  const { gatherCompanyStatus } = await loadWorkspacePackage('company-engine');
  const status = gatherCompanyStatus(root);

  if (values.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const { ventures, brandFindings, finance, repoHealth: health, learning } = status;

  console.log('=== Ops ===');
  for (const venture of ventures) {
    if (!venture.hasBridge) {
      console.log(`${venture.name}: no operational bridge configured yet.`);
      continue;
    }
    const counts = Object.entries(venture.stepCounts || {}).map(([status, n]) => `${status}=${n}`).join(', ');
    console.log(`${venture.name}: ${venture.totalSteps} steps (${counts}) | autoMode=${venture.autoMode} | status=${venture.status}`);
    if (venture.blockers && venture.blockers.length) {
      console.log(`  blockers: ${JSON.stringify(venture.blockers)}`);
    }
  }

  console.log('');
  console.log('=== Brand audit ===');
  for (const finding of brandFindings) {
    console.log(`[${finding.level.toUpperCase()}] ${finding.brand}: ${finding.message}`);
  }

  console.log('');
  console.log('=== Finance ===');
  if (!finance.hasData) {
    console.log('No ledger data yet. No revenue/cost source is wired up yet - add entries manually or integrate a real source.');
  } else {
    console.log(`Revenue: ${finance.totalRevenue} | Cost: ${finance.totalCost} | Net: ${finance.net} (${finance.entryCount} entries)`);
    for (const [venture, totals] of Object.entries(finance.byVenture)) {
      console.log(`  ${venture}: revenue=${totals.revenue} cost=${totals.cost}`);
    }
  }

  console.log('');
  console.log('=== Repo health ===');
  console.log(`Branch: ${health.branch ?? 'unknown'} | Uncommitted files: ${health.uncommittedFiles}`);
  if (!health.lastVerification.hasData) {
    console.log('No verification.json found yet - run "npm run verify" to generate one.');
  } else {
    const v = health.lastVerification;
    console.log(`Last verify (${v.verifiedAt}): ${v.status} | build ${v.buildPassed}/${v.buildTotal} | test ${v.testPassed}/${v.testTotal}`);
  }

  console.log('');
  console.log('=== Learning Labs ===');
  if (!learning.hasData) {
    console.log('No lessons captured yet - run "exo operation learn <operation-id>" after a completed operation.');
  } else {
    console.log(`${learning.totalLessons} lesson(s) captured, ${learning.promotedCount} promoted to a new objective.`);
    for (const lesson of learning.recent) {
      console.log(`  ${lesson.promoted ? '[promoted]' : '[captured] '} ${lesson.id} - ${lesson.title}`);
    }
  }
}

function workerHelp() {
  console.log([
    'Worker Commands:',
    '  worker list',
    '  worker run <step-id> [--backend claude|codex|local]',
    ''
  ].join(nl));
}

// Roadmap steps map to venture-workspace tasks by studio lane - see
// exotic-operations-console-v1.0/scripts/codex-bridge-runtime.mjs's recordRoadmapEvidence(),
// which this mirrors so a step completed via this CLI and one completed via the bridge's
// HTTP API produce the same evidence-record shape.
function matchingTaskId(workspace, step) {
  const lane = String(step.lane || '').toUpperCase();
  const task = (workspace.tasks || []).find((item) => item.taskId.endsWith(`-TASK-${lane}`));
  return task ? task.taskId : null;
}

async function recordWorkerCompletion(step, evidence) {
  const port = process.env.EXOTIC_BRIDGE_PORT || 8787;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/bridge/roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: step.id, status: 'completed', progress: 100, evidence })
    });
    if (response.ok) return 'bridge-api';
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `bridge API returned ${response.status}`);
  } catch (error) {
    // Bridge server isn't running (or rejected the update) - fall back to writing the
    // same two files it would have written, so this works standalone too.
    const roadmapFile = path.join(bridgeRoot(), 'roadmap.json');
    const roadmap = readRoadmapFile();
    if (!roadmap.length) throw new Error(`No roadmap found and bridge API unavailable: ${error.message}`);
    const nextRoadmap = roadmap.map((item) =>
      item.id === step.id ? { ...item, status: 'completed', progress: 100 } : item
    );
    fs.writeFileSync(roadmapFile, JSON.stringify(nextRoadmap, null, 2));

    const workspaceFile = path.join(bridgeRoot(), 'venture-workspace.json');
    if (fs.existsSync(workspaceFile)) {
      const { appendEvidenceRecord } = await loadWorkspacePackage('entity');
      const workspace = readJson(workspaceFile);
      const taskId = matchingTaskId(workspace, step);
      const next = appendEvidenceRecord(workspace, {
        relatedEntityType: taskId ? 'task' : 'venture',
        relatedEntityId: taskId || workspace.venture.ventureId,
        evidenceType: 'runtime-log',
        source: `${step.id} ${step.title}: ${evidence.join('; ')}`
      });
      fs.writeFileSync(workspaceFile, JSON.stringify(next, null, 2));
    }
    return 'file-fallback';
  }
}

async function workerCommand(argv) {
  const subcommand = argv[1];
  const { values } = parseFlags(argv.slice(2));

  if (subcommand === 'list') {
    const roadmap = readRoadmapFile();
    if (!roadmap.length) {
      console.log('No roadmap found at .exotic/codex-bridge/roadmap.json.');
      return;
    }
    const { planProductionFabric } = await loadWorkspacePackage('workflow');
    const plan = planProductionFabric({
      title: 'EXOTIC roadmap',
      jobs: roadmap.map((item) => ({
        id: item.id,
        title: item.title,
        lane: item.lane || 'roadmap',
        dependsOn: item.dependsOn || []
      }))
    });
    const byId = new Map(roadmap.map((item) => [item.id, item]));
    for (const layer of plan.layers) {
      for (const swarm of layer.swarms) {
        for (const cell of swarm.cells) {
          const step = byId.get(cell.jobId);
          console.log(`${cell.jobId}  ${step?.status ?? 'unknown'}  ${step?.progress ?? 0}%  ${step?.title ?? ''}`);
        }
      }
    }
    if (plan.blocked.length) {
      console.log('');
      console.log('Blocked:');
      for (const item of plan.blocked) {
        console.log(`  ${item.jobId}  ${item.reason}  waiting on: ${item.waitingOn.join(', ')}`);
      }
    }
    return;
  }

  if (subcommand === 'run') {
    const stepId = argv[2];
    if (!stepId) {
      console.error('Missing step id. Usage: exo worker run <step-id> [--backend claude|codex|local]');
      process.exit(1);
    }
    const roadmap = readRoadmapFile();
    const step = roadmap.find((item) => item.id === stepId);
    if (!step) {
      console.error(`Unknown roadmap step: ${stepId}`);
      process.exit(1);
    }
    const backend = values.backend || process.env.EXOTIC_WORKER_BACKEND || 'claude';
    const { dispatchStep } = await loadWorkspacePackage('codex-worker');
    console.log(`Dispatching ${step.id} (${step.title}) to backend "${backend}"...`);
    const result = await dispatchStep(
      { id: step.id, title: step.title, lane: step.lane, dependsOn: step.dependsOn },
      { backend, cwd: root }
    );
    if (result.status === 'failed') {
      console.error(`Dispatch failed: ${result.error}`);
      process.exit(1);
    }
    console.log('Evidence:');
    for (const line of result.receipt.evidence) console.log(`  - ${line}`);
    const via = await recordWorkerCompletion(step, result.receipt.evidence);
    console.log('');
    console.log(`Step ${step.id} marked completed (recorded via ${via}).`);
    return;
  }

  workerHelp();
}

function help() {
  console.log([
    'EXOTIC',
    'Everything Is Exotic.',
    '',
    'Each group below: WHAT it does, then WHY you would use it, then the real commands.',
    '',
    '=== worker - runs one roadmap step through a real AI backend ===',
    'WHAT: dispatches a step to claude/codex/local, in an isolated git worktree on its own',
    '  branch - never your real working tree.',
    'WHY:  IF the backend finishes AND its tests pass, THEN the result is merged into your',
    '  real branch automatically. IF tests fail (or nothing was committed), THEN nothing',
    '  merges - the attempt is reported and left for you, your working tree stays untouched.',
    '  This if/then gate is what lets dispatch run unattended without risking your repo.',
    '  worker list',
    '  worker run <step-id> [--backend claude|codex|local]',
    '',
    '=== pattern - reusable roadmap templates ===',
    'WHAT: a named, pre-defined list of roadmap steps (e.g. "phase1-foundation").',
    'WHY:  seeds a new venture\'s roadmap without hand-writing every step - pick a pattern',
    '  that matches what you\'re building instead of starting from a blank roadmap.',
    '  pattern list',
    '  pattern show <name>',
    '  pattern apply <name> [--force]',
    '',
    '=== blueprint - reusable code/package templates ===',
    'WHAT: a named, pre-defined file scaffold for a new package (basic-package,',
    '  service-module, component-kit).',
    'WHY:  new packages start from a real, already-working structure instead of a blank',
    '  folder - pick the blueprint that matches what you\'re building.',
    '  blueprint list',
    '  blueprint show <name>',
    '  blueprint apply <name> <package-name>',
    '',
    '=== company - cross-venture status, advise-only ===',
    'WHAT: one report combining live roadmap status, a brand-rule check, finance ledger,',
    '  repo health, and captured lessons, across every tracked venture.',
    'WHY:  answers "what\'s actually going on right now" in one place - it never takes',
    '  action itself, only surfaces what a human should decide on.',
    '  company status [--json]',
    '',
    '=== harmony - cross-state consistency check ===',
    'WHAT: checks that the roadmap, workspace, and evidence files all agree with each',
    '  other.',
    'WHY:  catches drift (a step marked done with no evidence, a workspace referencing a',
    '  step that no longer exists) before it causes a confusing failure somewhere else.',
    '  harmony check',
    '',
    '=== objective/proposal/approval/operation/lesson/selector - the governed work engine ===',
    'WHAT: the full pipeline underneath worker/pattern - an objective becomes a proposal,',
    '  a proposal is admitted (approved) then executed as an operation, and an operation',
    '  can be turned into a lesson that feeds the next objective.',
    'WHY:  use this directly when you need explicit approval gates and an audit trail for',
    '  a piece of work - worker/pattern are the fast path for routine roadmap dispatch.',
    '  objective create <goal text>            proposal create <objective-id> [summary]',
    '  objective list                          proposal list',
    '  objective inspect <objective-id>        proposal inspect <proposal-id>',
    '  approval list                           proposal admit <proposal-id> [--approver <name>] [--authority <level>]',
    '  approval inspect <approval-id>          proposal execute <proposal-id> [--idempotency-key <key>]',
    '  operation list                          operation learn <operation-id> [--summary <text>]',
    '  operation inspect <operation-id>        lesson promote <lesson-id> [--type objective]',
    '  lesson list                             selector materialize <selector-id>',
    '  lesson inspect <lesson-id>               selector draft-proposal <selector-id>',
    '  selector list                           selector admit-proposal <selector-id>',
    '  selector inspect <selector-id>          selector execute-proposal <selector-id>',
    '                                           selector learn-execution <selector-id>',
    '',
    '=== workspace utilities ===',
    '  doctor            WHAT/WHY: checks every package has the files it needs to build.',
    '  list packages     WHAT/WHY: lists every package currently in packages/.',
    '  new package <name> WHAT/WHY: shortcut for "blueprint apply basic-package <name>".',
    '  build             WHAT/WHY: builds every package (npm run build).',
    '  help              WHAT/WHY: this text.',
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
} else if (args[0] === 'worker') {
  workerCommand(args).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (args[0] === 'pattern') {
  patternCommand(args).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (args[0] === 'harmony') {
  harmonyCommand(args).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (args[0] === 'company') {
  companyCommand(args).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (args[0] === 'blueprint') {
  blueprintCommand(args);
} else if (args[0] === 'new' && args[1] === 'package') {
  createPackage(args[2]);
} else if (args[0] === 'build') {
  build();
} else {
  help();
}
