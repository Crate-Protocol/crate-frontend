import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  sampleTitles?: string[];
  loading?: boolean;
}

export function SearchBar({ value, onChange, sampleTitles = [], loading }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce parent update
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(timerRef.current);
  }, [local, onChange]);

  // Sync from parent
  useEffect(() => { setLocal(value); }, [value]);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = local.length > 0
    ? sampleTitles
        .filter(t => t.toLowerCase().includes(local.toLowerCase()))
        .slice(0, 5)
    : [];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      setLocal(suggestions[selectedIndex]);
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [suggestions, selectedIndex]);

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          ref={inputRef}
          value={local}
          onChange={e => { setLocal(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
          onFocus={() => local.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search beats…"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600 transition-colors"
        />
        {local && (
          <button
            onClick={() => { setLocal(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
        {loading && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl z-50">
          {suggestions.map((title, i) => (
            <button
              key={title}
              onMouseDown={() => { setLocal(title); setShowDropdown(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                i === selectedIndex ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {!local && !loading && (
          <kbd className="text-[10px] text-neutral-600 bg-neutral-800 rounded px-1.5 py-0.5 font-mono">/</kbd>
        )}
      </div>
    </div>
  );
}
