import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { captureEvidence, snapshotWorkingTree } from '../src/evidence';

let repoDir: string;

beforeEach(() => {
  repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-worker-evidence-'));
  execFileSync('git', ['init', '-q'], { cwd: repoDir });
});

afterEach(() => {
  fs.rmSync(repoDir, { recursive: true, force: true });
});

describe('snapshotWorkingTree', () => {
  it('reports an empty snapshot for a clean repo', () => {
    const snapshot = snapshotWorkingTree(repoDir);
    expect(snapshot.entries.size).toBe(0);
  });

  it('reports untracked files', () => {
    fs.writeFileSync(path.join(repoDir, 'new.txt'), 'hello');
    const snapshot = snapshotWorkingTree(repoDir);
    expect(snapshot.entries.get('new.txt')).toBe('??');
  });
});

describe('captureEvidence', () => {
  it('reports files that changed after the before snapshot', () => {
    const before = snapshotWorkingTree(repoDir);
    fs.writeFileSync(path.join(repoDir, 'created-by-worker.txt'), 'worker output');
    const evidence = captureEvidence({ cwd: repoDir, before });
    expect(evidence).toEqual(['?? created-by-worker.txt']);
  });

  it('does not attribute pre-existing dirty state to the worker', () => {
    fs.writeFileSync(path.join(repoDir, 'already-dirty.txt'), 'pre-existing change');
    const before = snapshotWorkingTree(repoDir);
    const evidence = captureEvidence({ cwd: repoDir, before });
    expect(evidence).toEqual([]);
  });

  it('reports content changes to a file that was already dirty', () => {
    const filePath = path.join(repoDir, 'already-dirty.txt');
    fs.writeFileSync(filePath, 'pre-existing change');
    const before = snapshotWorkingTree(repoDir);
    fs.writeFileSync(filePath, 'worker changed the same dirty file');
    const evidence = captureEvidence({ cwd: repoDir, before });
    expect(evidence).toEqual(['?? already-dirty.txt']);
  });

  it('appends a test summary when provided', () => {
    const before = snapshotWorkingTree(repoDir);
    const evidence = captureEvidence({ cwd: repoDir, before, testSummary: '3 passed' });
    expect(evidence).toContain('test: 3 passed');
  });
});
