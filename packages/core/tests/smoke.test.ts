import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { ExoticDashboard } from '../src/index';

describe('core package smoke', () => {
  it('has a valid Exotic package manifest', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.name).toBe('@exotic/core');
    expect(pkg.version).toBe('0.1.0');
  });
});

describe('ExoticDashboard.snapshot', () => {
  // Ported from apps/studio's original entry point, which just printed this snapshot
  // to stdout with no assertions - promoted to a real check when apps/studio was
  // replaced with the actual Studio UI (formerly the standalone exotic-studio app).
  it('reports an online status backed by device, network, metrics, and mesh data', () => {
    const snapshot = ExoticDashboard.snapshot();

    expect(snapshot.status).toBe('online');
    expect(snapshot.title).toBe('EXOTIC');
    expect(snapshot.device).toBeTruthy();
    expect(snapshot.network).toBeTruthy();
    expect(snapshot.metrics).toBeTruthy();
    expect(snapshot.mesh).toBeTruthy();
    expect(snapshot.optimization).toBeTruthy();
  });
});
