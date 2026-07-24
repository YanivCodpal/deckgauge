'use client';

import { useEffect, useRef, useState } from 'react';
import { colorForValue } from './colorForValue';

interface ColoredSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  onAddOption?: (value: string) => void;
}

export function ColoredSelect({
  value,
  options,
  onChange,
  ariaLabel,
  allowEmpty = true,
  emptyLabel = '—',
  onAddOption,
}: ColoredSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const hasValue = value.trim() !== '';
  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onAddOption?.(v);
    setDraft('');
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="w-full cursor-pointer rounded-sm border-0 px-2 py-1 text-left text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
        style={{ backgroundColor: colorForValue(value), color: hasValue ? '#ffffff' : '#475569' }}
      >
        {hasValue ? value : emptyLabel}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-40 rounded border border-slate-200 bg-white p-1 shadow-lg">
          {allowEmpty && (
            <button
              type="button"
              aria-label={`Clear ${ariaLabel}`}
              onClick={() => select('')}
              className="block w-full rounded px-2 py-1 text-left text-xs text-slate-500 hover:bg-slate-100"
            >
              {emptyLabel}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => select(o)}
              className="mb-0.5 block w-full rounded px-2 py-1 text-left text-xs font-semibold text-white"
              style={{ backgroundColor: colorForValue(o) }}
            >
              {o}
            </button>
          ))}
          {onAddOption && (
            <div className="mt-1 flex gap-1 border-t border-slate-100 pt-1">
              <input
                aria-label={`Add value to ${ariaLabel}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
                placeholder="New value"
                className="min-w-0 flex-1 rounded border border-slate-200 px-1 py-0.5 text-xs focus:border-indigo-300 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Add value"
                onClick={add}
                className="shrink-0 rounded bg-indigo-600 px-2 py-0.5 text-xs text-white hover:bg-indigo-700"
              >
                +
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
