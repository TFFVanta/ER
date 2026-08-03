import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyFileEdits, parseFileEdits } from '../src/apply-edits';

describe('parseFileEdits', () => {
  it('parses a single write block', () => {
    const text = [
      '===EXOTIC-WRITE-FILE: src/foo.ts===',
      'export const foo = 1;',
      '===EXOTIC-END-FILE===',
    ].join('\n');
    expect(parseFileEdits(text)).toEqual([
      { kind: 'write', path: 'src/foo.ts', content: 'export const foo = 1;' },
    ]);
  });

  it('parses multiple write blocks and preserves multi-line content', () => {
    const text = [
      'Here is what I changed:',
      '===EXOTIC-WRITE-FILE: a.txt===',
      'line one',
      'line two',
      '===EXOTIC-END-FILE===',
      '===EXOTIC-WRITE-FILE: b.txt===',
      'only line',
      '===EXOTIC-END-FILE===',
    ].join('\n');
    expect(parseFileEdits(text)).toEqual([
      { kind: 'write', path: 'a.txt', content: 'line one\nline two' },
      { kind: 'write', path: 'b.txt', content: 'only line' },
    ]);
  });

  it('parses a delete line', () => {
    const text = '===EXOTIC-DELETE-FILE: old.txt===';
    expect(parseFileEdits(text)).toEqual([{ kind: 'delete', path: 'old.txt' }]);
  });

  it('drops a write block with no closing marker', () => {
    const text = ['===EXOTIC-WRITE-FILE: truncated.txt===', 'partial content'].join('\n');
    expect(parseFileEdits(text)).toEqual([]);
  });

  it('returns no edits for prose with no blocks', () => {
    expect(parseFileEdits('I could not find a way to make this change.')).toEqual([]);
  });
});

describe('applyFileEdits', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-worker-apply-edits-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('writes a new file, creating parent directories', () => {
    const result = applyFileEdits(cwd, [
      { kind: 'write', path: 'nested/dir/file.txt', content: 'hello' },
    ]);
    expect(result.applied).toEqual([{ path: 'nested/dir/file.txt', kind: 'write' }]);
    expect(result.rejected).toEqual([]);
    expect(fs.readFileSync(path.join(cwd, 'nested/dir/file.txt'), 'utf8')).toBe('hello');
  });

  it('overwrites an existing file', () => {
    fs.writeFileSync(path.join(cwd, 'existing.txt'), 'old');
    applyFileEdits(cwd, [{ kind: 'write', path: 'existing.txt', content: 'new' }]);
    expect(fs.readFileSync(path.join(cwd, 'existing.txt'), 'utf8')).toBe('new');
  });

  it('deletes a file', () => {
    fs.writeFileSync(path.join(cwd, 'gone.txt'), 'bye');
    const result = applyFileEdits(cwd, [{ kind: 'delete', path: 'gone.txt' }]);
    expect(result.applied).toEqual([{ path: 'gone.txt', kind: 'delete' }]);
    expect(fs.existsSync(path.join(cwd, 'gone.txt'))).toBe(false);
  });

  it('rejects a path that escapes the workspace via ../', () => {
    const result = applyFileEdits(cwd, [
      { kind: 'write', path: '../outside.txt', content: 'nope' },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual([
      { path: '../outside.txt', reason: 'path escapes the workspace' },
    ]);
    expect(fs.existsSync(path.join(cwd, '..', 'outside.txt'))).toBe(false);
  });

  it('rejects an absolute path', () => {
    const absolute = path.join(os.tmpdir(), 'absolute-target.txt');
    const result = applyFileEdits(cwd, [{ kind: 'write', path: absolute, content: 'nope' }]);
    expect(result.applied).toEqual([]);
    expect(result.rejected[0]?.reason).toBe('path escapes the workspace');
    expect(fs.existsSync(absolute)).toBe(false);
  });
});
