'use client';

import { useEffect, useRef, useState } from 'react';

export interface NewMenuItem {
  label: string;
  icon: JSX.Element;
  onSelect?: () => void;
  /** Shown greyed with a hint when the feature isn't wired yet. */
  disabled?: boolean;
  hint?: string;
}

interface SidebarNewMenuProps {
  items: NewMenuItem[];
}

/**
 * Replaces the old cramped three-button footer. One primary button opens a
 * popover that grows downward — new create actions cost a row, not horizontal
 * pixels.
 */
export function SidebarNewMenu({ items }: SidebarNewMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (item: NewMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onSelect?.();
  };

  return (
    <div ref={rootRef} className="relative border-t border-slate-200 px-3 py-2.5">
      {open && (
        <div
          role="menu"
          aria-label="Create"
          className="absolute inset-x-3 bottom-full mb-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Create
          </p>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => select(item)}
              title={item.disabled ? item.hint : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${
                item.disabled
                  ? 'cursor-not-allowed text-slate-400'
                  : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  item.disabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.disabled && item.hint && (
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-violet-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New
      </button>
    </div>
  );
}
