import { describe, expect, it } from 'vitest';
import { composeRoadmap } from '../src/compose';
import { validatePattern, PatternValidationError } from '../src/compose';
import { findPattern, roadmapPatterns } from '../src/patterns';
import type { RoadmapPattern } from '../src/patterns';

describe('roadmapPatterns', () => {
  it('includes the phase1-foundation pattern with all 16 steps', () => {
    expect(roadmapPatterns.map((pattern) => pattern.name)).toContain('phase1-foundation');
    const pattern = findPattern('phase1-foundation')!;
    expect(pattern.steps).toHaveLength(16);
    expect(pattern.steps.map((step) => step.id)).toEqual(
      Array.from({ length: 16 }, (_, index) => `P1-${String(index + 1).padStart(2, '0')}`),
    );
  });

  it('validates cleanly - no unknown or cyclic dependencies', () => {
    const pattern = findPattern('phase1-foundation')!;
    expect(() => validatePattern(pattern)).not.toThrow();
  });
});

describe('composeRoadmap', () => {
  it('produces a fresh roadmap where every step starts pending at 0%', () => {
    const roadmap = composeRoadmap('phase1-foundation');
    expect(roadmap).toHaveLength(16);
    expect(roadmap.every((step) => step.status === 'pending' && step.progress === 0)).toBe(true);
    expect(roadmap[0]).toMatchObject({ id: 'P1-01', dependsOn: [] });
    expect(roadmap.find((step) => step.id === 'P1-06')?.dependsOn).toEqual(['P1-05', 'P1-12']);
  });

  it('applies per-step overrides', () => {
    const roadmap = composeRoadmap('phase1-foundation', {
      overrides: {
        'P1-01': { status: 'completed', progress: 100 },
      },
    });
    const step = roadmap.find((item) => item.id === 'P1-01');
    expect(step?.status).toBe('completed');
    expect(step?.progress).toBe(100);
    expect(roadmap.find((item) => item.id === 'P1-02')?.status).toBe('pending');
  });

  it('throws on an unknown pattern name', () => {
    expect(() => composeRoadmap('does-not-exist')).toThrow(/unknown roadmap pattern/i);
  });

  it('rejects a pattern with an unknown dependency', () => {
    const broken: RoadmapPattern = {
      name: 'broken',
      description: 'test fixture',
      steps: [
        {
          id: 'A',
          title: 'A',
          summary: '',
          expectedDuration: '',
          priority: 'Normal',
          owner: 'test',
          lane: 'test',
          dependsOn: ['DOES-NOT-EXIST'],
        },
      ],
    };
    expect(() => validatePattern(broken)).toThrow(PatternValidationError);
  });

  it('rejects a pattern with a dependency cycle', () => {
    const cyclic: RoadmapPattern = {
      name: 'cyclic',
      description: 'test fixture',
      steps: [
        {
          id: 'A',
          title: 'A',
          summary: '',
          expectedDuration: '',
          priority: 'Normal',
          owner: 'test',
          lane: 'test',
          dependsOn: ['B'],
        },
        {
          id: 'B',
          title: 'B',
          summary: '',
          expectedDuration: '',
          priority: 'Normal',
          owner: 'test',
          lane: 'test',
          dependsOn: ['A'],
        },
      ],
    };
    expect(() => validatePattern(cyclic)).toThrow(/cycle/i);
  });
});
