'use client';

import { useEffect, useRef, useState } from 'react';
import { searchLocations } from '../../actions/locations';
import { addCustomLocation, searchCustomLocations } from './custom-locations';

interface Props {
  value: string;
  onSave: (value: string) => void;
}

const inputCls =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-200 focus:border-indigo-300 focus:outline-none';

const DEBOUNCE_MS = 250;

/** Merge remembered custom labels ahead of dataset results, deduped case-insensitively. */
function mergeSuggestions(custom: string[], dataset: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const label of [...custom, ...dataset]) {
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function LocationCell({ value, onSave }: Props) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when a suggestion is picked so the following blur doesn't also record
  // the value as a custom free-text entry.
  const chosenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const runSearch = (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const custom = searchCustomLocations(q);
      void searchLocations(q).then((res) => {
        const merged = mergeSuggestions(
          custom,
          res.map((r) => r.label),
        );
        setSuggestions(merged);
        setOpen(merged.length > 0);
        setHighlight(-1);
      });
    }, DEBOUNCE_MS);
  };

  const handleChange = (next: string) => {
    setText(next);
    runSearch(next);
  };

  const choose = (label: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    chosenRef.current = true;
    setText(label);
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    onSave(label);
  };

  const commitFreeText = () => {
    if (chosenRef.current) {
      chosenRef.current = false;
      return;
    }
    if (text !== value) {
      addCustomLocation(text);
      onSave(text);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlight >= 0) {
        e.preventDefault();
        choose(suggestions[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <span aria-hidden className="shrink-0 text-slate-400">
        📍
      </span>
      <input
        type="text"
        aria-label="Location"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitFreeText}
        className={`${inputCls} min-w-0 flex-1`}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-6 top-full z-30 mt-1 max-h-56 w-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(label);
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-indigo-50 ${
                  i === highlight ? 'bg-indigo-50' : ''
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
