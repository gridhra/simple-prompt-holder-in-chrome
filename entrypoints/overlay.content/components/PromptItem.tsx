import { useState } from 'react';
import type { Prompt } from '@/src/types';

interface PromptItemProps {
  prompt: Prompt;
  isActive: boolean;
  onCopy: (body: string) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
}

export default function PromptItem({
  prompt,
  isActive,
  onCopy,
  onEdit,
  onDelete,
}: PromptItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleActivate = () => {
    if (!confirmDelete) onCopy(prompt.body);
  };

  return (
    <div
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      className={`sph-prompt-item${isActive ? ' is-active' : ''}`}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      data-prompt-id={prompt.id}
    >
      <div className="sph-prompt-content">
        <div className="sph-prompt-title">{prompt.title}</div>
        <div className="sph-prompt-body">{prompt.body}</div>
      </div>

      {confirmDelete ? (
        <div className="sph-prompt-confirm">
          <span className="sph-confirm-text">削除しますか?</span>
          <button
            type="button"
            className="sph-btn sph-btn--sm sph-btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(prompt.id);
            }}
          >
            削除する
          </button>
          <button
            type="button"
            className="sph-btn sph-btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(false);
            }}
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div className="sph-prompt-actions">
          <button
            type="button"
            className="sph-btn sph-btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
          >
            編集
          </button>
          <button
            type="button"
            className="sph-btn sph-btn--sm sph-btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}
