import { describe, expect, it } from 'vitest';
import { dispatchStep } from '../src/dispatch';

const step = { id: 'P1-05', title: 'Initialize the Ideas studio', lane: 'ideas', dependsOn: ['P1-04'] };

describe('dispatchStep', () => {
  it('returns a completed receipt when the worker produces evidence', async () => {
    const result = await dispatchStep(step, {
      backend: async (context) => {
        expect(context.job.id).toBe('P1-05');
        expect(context.job.lane).toBe('ideas');
        return { output: 'did the work', evidence: ['studios/ideas/workspace.md'] };
      },
      cwd: process.cwd(),
    });

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.receipt.evidence).toEqual(['studios/ideas/workspace.md']);
    }
  });

  it('treats an empty-evidence receipt as a failure, not a success', async () => {
    const result = await dispatchStep(step, {
      backend: async () => ({ output: 'claimed done but touched nothing', evidence: [] }),
      cwd: process.cwd(),
    });

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toMatch(/no evidence/i);
    }
  });

  it('captures a thrown backend error as a structured failure instead of throwing', async () => {
    const result = await dispatchStep(step, {
      backend: async () => {
        throw new Error('claude CLI not found');
      },
      cwd: process.cwd(),
    });

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toBe('claude CLI not found');
    }
  });
});
