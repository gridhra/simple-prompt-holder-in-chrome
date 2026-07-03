import { describe, expect, it } from 'vitest';
import {
  addPrompt,
  exportPrompts,
  getAllPrompts,
  importPrompts,
  isValidExport,
} from '../src/storage';
import type { Prompt } from '../src/types';

const makePrompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  id: 'test-id-1',
  title: 'Test Title',
  body: 'Test Body',
  tags: ['tag1'],
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe('exportPrompts', () => {
  it('returns { version: 1, exportedAt: number, prompts: [...] } containing stored prompts', async () => {
    const p = await addPrompt({ title: 'Export Me', body: 'Content', tags: ['a'] });
    const exported = await exportPrompts();

    expect(exported.version).toBe(1);
    expect(typeof exported.exportedAt).toBe('number');
    expect(Array.isArray(exported.prompts)).toBe(true);
    expect(exported.prompts).toHaveLength(1);
    expect(exported.prompts[0]).toEqual(p);
  });
});

describe('importPrompts — replace mode', () => {
  it('replaces everything', async () => {
    await addPrompt({ title: 'Old', body: 'Old Body' });

    const newPrompts = [makePrompt({ id: 'new-1', title: 'New 1', body: 'New Body 1' })];
    const result = await importPrompts(
      { version: 1, exportedAt: Date.now(), prompts: newPrompts },
      'replace',
    );

    const all = await getAllPrompts();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('new-1');
    expect(result.added).toBe(1);
    expect(result.total).toBe(1);
  });
});

describe('importPrompts — merge mode', () => {
  it('skips prompts whose id already exists, adds new ones, returns correct {added, total}', async () => {
    const existing = await addPrompt({ title: 'Existing', body: 'Body' });

    const incoming = [
      // same id as existing => should be skipped
      makePrompt({ id: existing.id, title: 'Duplicate', body: 'Dup Body' }),
      // new id => should be added
      makePrompt({ id: 'brand-new-id', title: 'New', body: 'New Body' }),
    ];

    const result = await importPrompts(
      { version: 1, exportedAt: Date.now(), prompts: incoming },
      'merge',
    );

    const all = await getAllPrompts();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(existing.id);
    expect(all[0].title).toBe('Existing'); // original not overwritten
    expect(all[1].id).toBe('brand-new-id');
    expect(result.added).toBe(1);
    expect(result.total).toBe(2);
  });
});

describe('importPrompts — invalid format throws', () => {
  const invalidCases: [string, unknown][] = [
    ['non-object (null)', null],
    ['non-object (string)', 'not an object'],
    ['non-object (number)', 42],
    ['missing version', { exportedAt: 1000, prompts: [] }],
    ['version !== 1', { version: 2, exportedAt: 1000, prompts: [] }],
    ['prompts not an array', { version: 1, exportedAt: 1000, prompts: 'bad' }],
    [
      'prompt missing body',
      {
        version: 1,
        exportedAt: 1000,
        prompts: [{ id: 'x', title: 'T', createdAt: 1, updatedAt: 1 }],
      },
    ],
    [
      'prompt with non-string tag',
      {
        version: 1,
        exportedAt: 1000,
        prompts: [{ id: 'x', title: 'T', body: 'B', tags: [123], createdAt: 1, updatedAt: 1 }],
      },
    ],
  ];

  for (const [label, data] of invalidCases) {
    it(`throws 'Invalid export format' on: ${label}`, async () => {
      await expect(importPrompts(data, 'replace')).rejects.toThrow('Invalid export format');
    });
  }
});

describe('isValidExport', () => {
  it('returns true for a valid export', () => {
    expect(
      isValidExport({
        version: 1,
        exportedAt: Date.now(),
        prompts: [makePrompt()],
      }),
    ).toBe(true);
  });

  it('returns false for invalid exports', () => {
    expect(isValidExport(null)).toBe(false);
    expect(isValidExport({ version: 2, exportedAt: 1, prompts: [] })).toBe(false);
    expect(isValidExport({ version: 1, exportedAt: 1, prompts: 'bad' })).toBe(false);
  });
});

describe('round-trip', () => {
  it('export → import into empty storage (replace) → getAllPrompts deep-equals original', async () => {
    const p1 = await addPrompt({ title: 'Round', body: 'Trip', tags: ['rt'] });
    const p2 = await addPrompt({ title: 'Second', body: 'Prompt' });

    const exported = await exportPrompts();

    // Clear storage by replacing with empty, then re-import
    await importPrompts({ version: 1, exportedAt: Date.now(), prompts: [] }, 'replace');
    expect(await getAllPrompts()).toHaveLength(0);

    // Now import the original export
    await importPrompts(exported, 'replace');

    const restored = await getAllPrompts();
    expect(restored).toHaveLength(2);
    expect(restored[0]).toEqual(p1);
    expect(restored[1]).toEqual(p2);
  });
});
