#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';

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

function help() {
  console.log([
    'EXOTIC',
    'Everything Is Exotic.',
    '',
    'Commands:',
    '  doctor',
    '  list packages',
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
} else if (args[0] === 'new' && args[1] === 'package') {
  createPackage(args[2]);
} else if (args[0] === 'build') {
  build();
} else {
  help();
}
