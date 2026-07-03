import { storage } from '#imports';
import type { ImportMode, Prompt, PromptsExport } from './types';

const promptsItem = storage.defineItem<Prompt[]>('local:sph_prompts', {
  fallback: [],
});

export function getAllPrompts(): Promise<Prompt[]> {
  return promptsItem.getValue();
}

export function setAllPrompts(prompts: Prompt[]): Promise<void> {
  return promptsItem.setValue(prompts);
}

export async function addPrompt(data: Pick<Prompt, 'title' | 'body' | 'tags'>): Promise<Prompt> {
  const now = Date.now();
  const prompt: Prompt = {
    id: crypto.randomUUID(),
    title: data.title,
    body: data.body,
    ...(data.tags ? { tags: data.tags } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const prompts = await getAllPrompts();
  await setAllPrompts([...prompts, prompt]);
  return prompt;
}

export async function updatePrompt(
  id: string,
  data: Partial<Pick<Prompt, 'title' | 'body' | 'tags'>>,
): Promise<void> {
  const prompts = await getAllPrompts();
  await setAllPrompts(
    prompts.map((p) => (p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p)),
  );
}

export async function deletePrompt(id: string): Promise<void> {
  const prompts = await getAllPrompts();
  await setAllPrompts(prompts.filter((p) => p.id !== id));
}

export function watchPrompts(cb: (prompts: Prompt[]) => void): () => void {
  return promptsItem.watch((prompts) => cb(prompts ?? []));
}

export async function exportPrompts(): Promise<PromptsExport> {
  return {
    version: 1,
    exportedAt: Date.now(),
    prompts: await getAllPrompts(),
  };
}

function isValidPrompt(value: unknown): value is Prompt {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.body === 'string' &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number' &&
    (p.tags === undefined || (Array.isArray(p.tags) && p.tags.every((t) => typeof t === 'string')))
  );
}

export function isValidExport(value: unknown): value is PromptsExport {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return e.version === 1 && Array.isArray(e.prompts) && e.prompts.every(isValidPrompt);
}

export async function importPrompts(
  data: unknown,
  mode: ImportMode,
): Promise<{ added: number; total: number }> {
  if (!isValidExport(data)) {
    throw new Error('Invalid export format');
  }
  if (mode === 'replace') {
    await setAllPrompts(data.prompts);
    return { added: data.prompts.length, total: data.prompts.length };
  }
  const existing = await getAllPrompts();
  const existingIds = new Set(existing.map((p) => p.id));
  const incoming = data.prompts.filter((p) => !existingIds.has(p.id));
  const merged = [...existing, ...incoming];
  await setAllPrompts(merged);
  return { added: incoming.length, total: merged.length };
}
