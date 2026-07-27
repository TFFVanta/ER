import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('device package smoke', () => {
  it('has a valid Exotic package manifest', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.name).toBe('@exotic/device');
    expect(pkg.version).toBe('0.1.0');
  });
});
