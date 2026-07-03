export interface Prompt {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PromptsExport {
  version: 1;
  exportedAt: number;
  prompts: Prompt[];
}

export type ImportMode = 'merge' | 'replace';
