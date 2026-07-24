'use client';

import { useEffect, useRef, useState } from 'react';
import { isSystemColumnVisible } from '@deckgauge/shared';
import type { BoardColumn } from '@deckgauge/shared';

// System columns split around the custom columns to mirror the board's grid
// order. `name` (Item) is the pinned row anchor and can never be hidden.
const SIZE_COLUMN_NAME = 'Size';

const LEADING_SYSTEM: Array<{ key: string; label: string; locked?: boolean }> = [
  { key: 'name', label: 'Item', locked: true },
  { key: 'owner', label: 'Owner' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
];

interface TrailingRow {
  key: string;
  label: string;
  /** Only meaningful when an integration is connected. */
  integrationOnly?: boolean;
}

const TRAILING_SYSTEM: TrailingRow[] = [
  { key: 'size', label: 'Size' },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'duration', label: 'Duration' },
  { key: 'source', label: 'Source', integrationOnly: true },
  { key: 'updated', label: 'Updated' },
  { key: 'classification', label: 'CapEx/OpEx' },
];

interface BoardColumnsPanelProps {
  columns: BoardColumn[];
  /** Keys currently hidden (system keys or custom BoardColumn ids). */
  hidden: string[];
  hasIntegration: boolean;
  disabled?: boolean;
  onToggle: (key: string) => void;
  onAddColumn: () => void;
  onDeleteColumn: (columnId: string) => void;
}

export function BoardColumnsPanel({
  columns,
  hidden,
  hasIntegration,
  disabled,
  onToggle,
  onAddColumn,
  onDeleteColumn,
}: BoardColumnsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenSet = new Set(hidden);

  // The "Size" system field is stored as a BoardColumn named "Size" but toggled
  // via the pseudo-key `size`; keep it out of the custom-column list.
  const customColumns = columns.filter((c) => c.name !== SIZE_COLUMN_NAME);
  const trailing = TRAILING_SYSTEM.filter((r) => !r.integrationOnly || hasIntegration);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const renderRow = (
    key: string,
    label: string,
    opts?: { locked?: boolean; onDelete?: () => void },
  ) => (
    <div
      key={key}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
    >
      <label className="flex flex-1 items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          aria-label={label}
          checked={isSystemColumnVisible(key, hiddenSet)}
          disabled={disabled || opts?.locked}
          onChange={() => onToggle(key)}
          className="rounded"
        />
        <span className={opts?.locked ? 'text-gray-400' : ''}>{label}</span>
      </label>
      {opts?.onDelete && (
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={opts.onDelete}
          className="text-gray-300 hover:text-red-500"
        >
          ×
        </button>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Manage columns"
      >
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 max-h-96 w-56 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg z-20">
          {LEADING_SYSTEM.map((r) => renderRow(r.key, r.label, { locked: r.locked }))}

          {customColumns.length > 0 && <div className="my-1 border-t border-gray-100" />}
          {customColumns.map((col) =>
            renderRow(col.id, col.name, { onDelete: () => onDeleteColumn(col.id) }),
          )}

          <div className="my-1 border-t border-gray-100" />
          {trailing.map((r) => renderRow(r.key, r.label))}

          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              onAddColumn();
              setIsOpen(false);
            }}
            disabled={disabled}
            className="w-full px-3 py-2 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            ＋ Add column
          </button>
        </div>
      )}
    </div>
  );
}
