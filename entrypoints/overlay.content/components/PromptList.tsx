import { useEffect, useRef } from 'react';
import type { Prompt } from '@/src/types';
import PromptItem from './PromptItem';

interface PromptListProps {
  prompts: Prompt[];
  allPrompts: Prompt[];
  activeIndex: number;
  onCopy: (body: string) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onPointerActivity: () => void;
}

export default function PromptList({
  prompts,
  allPrompts,
  activeIndex,
  onCopy,
  onEdit,
  onDelete,
  onPointerActivity,
}: PromptListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIndex change re-renders .is-active; the DOM query depends on that render
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>('.is-active');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (allPrompts.length === 0) {
    return (
      <div className="sph-empty">プロンプトがありません。「新規追加」から登録してください</div>
    );
  }

  if (prompts.length === 0) {
    return <div className="sph-empty">該当なし</div>;
  }

  return (
    <div role="listbox" className="sph-prompt-list" ref={listRef} onPointerMove={onPointerActivity}>
      {prompts.map((prompt, index) => (
        <PromptItem
          key={prompt.id}
          prompt={prompt}
          isActive={index === activeIndex}
          onCopy={onCopy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
