#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const nl = String.fromCharCode(10);

function findRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'packages'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const root = findRoot(process.cwd());

function cleanName(input) {
  return String(input || '').toLowerCase().replace(/^@exotic\//, '').replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
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

  fs.writeFileSync(path.join(dir, 'README.md'), ['# @exotic/' + name, '', 'Everything Is Exotic.', ''].join(nl));

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
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

  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      rootDir: 'src',
      outDir: 'dist'
    },
    include: ['src/**/*.ts']
  }, null, 2));

  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), [
    'export const identity = {',
    '  name: "@exotic/' + name + '",',
    '  tagline: "Everything Is Exotic."',
    '};',
    ''
  ].join(nl));

  console.log('✓ Package ' + name + ' created at packages/' + name);
}

if (args[0] === 'new' && args[1] === 'package') {
  createPackage(args[2]);
} else {
  console.log(['EXOTIC', 'Everything Is Exotic.', '', 'Commands:', '  new package <name>'].join(nl));
}
