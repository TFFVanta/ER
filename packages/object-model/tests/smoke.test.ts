import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { LiveMetadataFabric } from '../src/core/fabric';
import { ProtectionGate } from '../src/core/protection';
import { createLiveMetadata } from '../src/core/metadata';
import { createUniversalObject } from '../src/core/object';
import { createInitialState } from '../src/core/state';

describe('object-model package smoke', () => {
  it('has a valid Exotic package manifest', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.name).toBe('@exotic/object-model');
    expect(pkg.version).toBe('0.1.0');
  });
});

describe('LiveMetadataFabric', () => {
  it('observes an object, links it, moves it, and seals it', async () => {
    const fabric = new LiveMetadataFabric();

    const a = await fabric.observe({ type: 'project', name: 'Exotic SDK', layer: 'project' });
    const b = await fabric.observe({ type: 'memory', name: 'Universal Memory Graph', layer: 'knowledge' });

    expect(a.object.address).toMatch(/^exo:\/\/project\//);
    expect(fabric.graph.objects.size).toBe(2);

    await fabric.link(a.object.id, b.object.id, 'contains');
    expect(fabric.graph.relatedTo(a.object.id)).toHaveLength(1);

    const moved = await fabric.move(b.object.id, 'archive');
    expect(moved.location.layer).toBe('archive');

    const sealed = await fabric.seal(b.object.id);
    expect(sealed.status).toBe('sealed');
    expect(sealed.protection.accessLevel).toBe('sealed');

    await expect(fabric.move(b.object.id, 'working', 'admin')).rejects.toThrow('sealed objects must remain in vault');
  });
});

describe('ProtectionGate', () => {
  it('denies reads to unauthorized roles and allows owners', () => {
    const gate = new ProtectionGate();
    const object = createUniversalObject({ type: 'file', name: 'secret plan' });
    const state = createInitialState(object.id);
    const metadata = createLiveMetadata(object, state, 'vault');

    expect(gate.canRead(metadata, 'owner').allowed).toBe(true);
    expect(gate.canRead(metadata, 'guest').allowed).toBe(false);
  });
});
