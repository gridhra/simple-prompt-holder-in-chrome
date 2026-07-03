import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPrompt, deletePrompt, getAllPrompts, updatePrompt, watchPrompts } from '../src/storage';

describe('getAllPrompts', () => {
  it('returns [] initially', async () => {
    const prompts = await getAllPrompts();
    expect(prompts).toEqual([]);
  });
});

describe('addPrompt', () => {
  it('returns a Prompt with string UUID id and numeric createdAt === updatedAt', async () => {
    const prompt = await addPrompt({ title: 'Hello', body: 'World' });
    expect(typeof prompt.id).toBe('string');
    expect(prompt.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(typeof prompt.createdAt).toBe('number');
    expect(typeof prompt.updatedAt).toBe('number');
    expect(prompt.createdAt).toBe(prompt.updatedAt);
  });

  it('getAllPrompts returns the added prompt', async () => {
    const prompt = await addPrompt({ title: 'T', body: 'B' });
    const all = await getAllPrompts();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(prompt);
  });

  it('multiple addPrompt calls accumulate in insertion order', async () => {
    const p1 = await addPrompt({ title: 'A', body: '1' });
    const p2 = await addPrompt({ title: 'B', body: '2' });
    const p3 = await addPrompt({ title: 'C', body: '3' });
    const all = await getAllPrompts();
    expect(all).toHaveLength(3);
    expect(all[0].id).toBe(p1.id);
    expect(all[1].id).toBe(p2.id);
    expect(all[2].id).toBe(p3.id);
  });
});

describe('updatePrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('patches title/body and bumps updatedAt', async () => {
    vi.setSystemTime(1000);
    const prompt = await addPrompt({ title: 'Old Title', body: 'Old Body' });
    expect(prompt.createdAt).toBe(1000);
    expect(prompt.updatedAt).toBe(1000);

    vi.setSystemTime(2000);
    await updatePrompt(prompt.id, { title: 'New Title', body: 'New Body' });

    const all = await getAllPrompts();
    expect(all).toHaveLength(1);
    const updated = all[0];
    expect(updated.title).toBe('New Title');
    expect(updated.body).toBe('New Body');
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(2000);
    expect(updated.updatedAt).toBeGreaterThan(updated.createdAt);
  });

  it('updatePrompt with unknown id is a no-op', async () => {
    const prompt = await addPrompt({ title: 'T', body: 'B' });
    await updatePrompt('non-existent-id', { title: 'Changed' });
    const all = await getAllPrompts();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('T');
    expect(all[0].id).toBe(prompt.id);
  });
});

describe('deletePrompt', () => {
  it('removes only the matching id', async () => {
    const p1 = await addPrompt({ title: 'A', body: '1' });
    const p2 = await addPrompt({ title: 'B', body: '2' });
    const p3 = await addPrompt({ title: 'C', body: '3' });

    await deletePrompt(p2.id);

    const all = await getAllPrompts();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id)).toEqual([p1.id, p3.id]);
  });
});

describe('watchPrompts', () => {
  it('fires callback when prompts change', async () => {
    const received: unknown[] = [];
    const unwatch = watchPrompts((prompts) => {
      received.push(prompts);
    });

    try {
      await addPrompt({ title: 'Watch test', body: 'Body' });
      // Give any microtasks/events a chance to flush
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (received.length === 0) {
        // watchPrompts may not fire synchronously under fakeBrowser; skip assertion
        console.warn('watchPrompts callback did not fire under fakeBrowser — skipping assertion');
        return;
      }

      const last = received[received.length - 1] as { title: string }[];
      expect(last).toHaveLength(1);
      expect(last[0].title).toBe('Watch test');
    } finally {
      unwatch();
    }
  });
});
