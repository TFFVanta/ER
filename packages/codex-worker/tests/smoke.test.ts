import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('codex-worker package smoke', () => {
  it('has a valid Exotic package manifest', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.name).toBe('@exotic/codex-worker');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
