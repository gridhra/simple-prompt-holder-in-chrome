import { type ChangeEvent, useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="sph-search-bar">
      <input
        ref={inputRef}
        type="text"
        className="sph-search-input"
        placeholder="プロンプトを検索…"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}
