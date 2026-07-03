import { type ChangeEvent, useState } from 'react';
import type { Prompt } from '@/src/types';

interface EditFormProps {
  target: Prompt | null;
  onSave: (title: string, body: string) => Promise<void>;
  onCancel: () => void;
}

export default function EditForm({ target, onSave, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(target?.title ?? '');
  const [body, setBody] = useState(target?.body ?? '');
  const [saving, setSaving] = useState(false);

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(title.trim(), body.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sph-edit-form">
      <div className="sph-form-field">
        <label htmlFor="sph-title-input" className="sph-form-label">
          タイトル
        </label>
        <input
          id="sph-title-input"
          // biome-ignore lint/a11y/noAutofocus: edit form needs immediate focus on open
          autoFocus
          type="text"
          className="sph-form-input"
          placeholder="タイトルを入力"
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        />
      </div>
      <div className="sph-form-field">
        <label htmlFor="sph-body-input" className="sph-form-label">
          本文
        </label>
        <textarea
          id="sph-body-input"
          className="sph-form-textarea"
          placeholder="プロンプトの本文を入力"
          rows={6}
          value={body}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
        />
      </div>
      <div className="sph-form-actions">
        <button
          type="button"
          className="sph-btn sph-btn--primary"
          disabled={!isValid || saving}
          onClick={handleSave}
        >
          保存
        </button>
        <button type="button" className="sph-btn" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
