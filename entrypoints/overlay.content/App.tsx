import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addPrompt,
  deletePrompt,
  exportPrompts,
  getAllPrompts,
  importPrompts,
  updatePrompt,
  watchPrompts,
} from '@/src/storage';
import type { Prompt, PromptsExport } from '@/src/types';
import EditForm from './components/EditForm';
import PromptList from './components/PromptList';
import SearchBar from './components/SearchBar';
import Toast from './components/Toast';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface PendingImport {
  parsed: PromptsExport;
  count: number;
}

interface AppProps {
  onClose: () => void;
}

export default function App({ onClose }: AppProps) {
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<Prompt | null>(null);
  const [query, setQuery] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prompts on mount and subscribe to changes
  useEffect(() => {
    getAllPrompts().then(setPrompts);
    const unwatch = watchPrompts(setPrompts);
    return unwatch;
  }, []);

  // Filtered prompts based on query
  const filteredPrompts = useMemo(() => {
    if (!query.trim()) return prompts;
    const q = query.toLowerCase();
    return prompts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
    );
  }, [prompts, query]);

  // Clamp activeIndex when the filtered list length changes
  useEffect(() => {
    setActiveIndex((prev) =>
      filteredPrompts.length === 0 ? 0 : Math.min(prev, filteredPrompts.length - 1),
    );
  }, [filteredPrompts.length]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ message, type });
    if (type === 'success') {
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 2000);
    }
  }, []);

  const copyToClipboard = useCallback(
    async (body: string) => {
      try {
        await navigator.clipboard.writeText(body);
        showToast('コピーしました', 'success');
      } catch {
        // Fallback for environments where clipboard API is unavailable
        try {
          const ta = document.createElement('textarea');
          ta.value = body;
          ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('コピーしました', 'success');
        } catch {
          showToast('コピーに失敗しました', 'error');
        }
      }
    },
    [showToast],
  );

  const handleKeyDown = useCallback(
    (e: { key: string; preventDefault(): void; stopPropagation(): void }) => {
      // Stop propagation so page shortcuts don't fire
      e.stopPropagation();

      if (mode === 'edit') {
        if (e.key === 'Escape') {
          setMode('list');
          setEditTarget(null);
        }
        return;
      }

      // List mode
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredPrompts.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        const item = filteredPrompts[activeIndex];
        if (item) {
          copyToClipboard(item.body);
        }
      }
    },
    [mode, filteredPrompts, activeIndex, onClose, copyToClipboard],
  );

  const handleEdit = useCallback((prompt: Prompt) => {
    setEditTarget(prompt);
    setMode('edit');
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deletePrompt(id);
  }, []);

  const handleSave = useCallback(
    async (title: string, body: string) => {
      if (editTarget) {
        await updatePrompt(editTarget.id, { title, body });
      } else {
        await addPrompt({ title, body });
      }
      setMode('list');
      setEditTarget(null);
      showToast('保存しました', 'success');
    },
    [editTarget, showToast],
  );

  const handleExport = useCallback(async () => {
    const data = await exportPrompts();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const yyyyMMdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `sph-prompts-${yyyyMMdd}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('エクスポートしました', 'success');
  }, [showToast]);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result;
          if (typeof text !== 'string') throw new Error('not a string');
          const parsed: unknown = JSON.parse(text);
          const count =
            typeof parsed === 'object' &&
            parsed !== null &&
            Array.isArray((parsed as { prompts?: unknown }).prompts)
              ? (parsed as { prompts: unknown[] }).prompts.length
              : 0;
          setPendingImport({ parsed: parsed as PromptsExport, count });
        } catch {
          showToast('読み込みに失敗しました', 'error');
        }
        // Reset so the same file can be re-selected
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file);
    },
    [showToast],
  );

  const handleImport = useCallback(
    async (importMode: 'merge' | 'replace') => {
      if (!pendingImport) return;
      try {
        const result = await importPrompts(pendingImport.parsed, importMode);
        setPendingImport(null);
        showToast(`${result.added}件インポートしました`, 'success');
      } catch {
        setPendingImport(null);
        showToast('不正なファイル形式です', 'error');
      }
    },
    [pendingImport, showToast],
  );

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(0);
  }, []);

  const handleCancelImport = useCallback(() => {
    setPendingImport(null);
  }, []);

  const handleNewPrompt = useCallback(() => {
    setEditTarget(null);
    setMode('edit');
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop — click-to-close; keyboard handled by the dialog
    <div
      className="sph-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sph-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="プロンプトホルダー"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {mode === 'list' ? (
          <>
            <SearchBar value={query} onChange={handleQueryChange} />
            <PromptList
              prompts={filteredPrompts}
              allPrompts={prompts}
              activeIndex={activeIndex}
              onCopy={copyToClipboard}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <div className="sph-footer">
              {pendingImport ? (
                <div className="sph-import-confirm">
                  <span className="sph-import-text">
                    {pendingImport.count}件のプロンプトをインポート:
                  </span>
                  <button
                    type="button"
                    className="sph-btn sph-btn--primary"
                    onClick={() => handleImport('merge')}
                  >
                    マージ
                  </button>
                  <button
                    type="button"
                    className="sph-btn sph-btn--danger"
                    onClick={() => handleImport('replace')}
                  >
                    置換
                  </button>
                  <button type="button" className="sph-btn" onClick={handleCancelImport}>
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="sph-footer-actions">
                  <button
                    type="button"
                    className="sph-btn sph-btn--primary"
                    onClick={handleNewPrompt}
                  >
                    新規追加
                  </button>
                  <button type="button" className="sph-btn" onClick={handleExport}>
                    エクスポート
                  </button>
                  <button
                    type="button"
                    className="sph-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    インポート
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <EditForm
            target={editTarget}
            onSave={handleSave}
            onCancel={() => {
              setMode('list');
              setEditTarget(null);
            }}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    </div>
  );
}
