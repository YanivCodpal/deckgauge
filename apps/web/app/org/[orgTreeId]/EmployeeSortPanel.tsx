'use client';

import type { EmployeeBoardColumnKey, EmployeeSortConfig } from '@deckgauge/shared';

interface Props {
  columns: { key: EmployeeBoardColumnKey; label: string }[];
  sort: EmployeeSortConfig | null;
  onChange: (s: EmployeeSortConfig | null) => void;
  onClose: () => void;
}

export function EmployeeSortPanel({ columns, sort, onChange, onClose }: Props) {
  const column = sort?.column ?? columns[0]?.key ?? 'name';
  const direction = sort?.direction ?? 'asc';

  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-sm shadow">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Sort by</span>
        <select
          aria-label="Sort by"
          value={column}
          onChange={(e) => onChange({ column: e.target.value as EmployeeBoardColumnKey, direction })}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {columns.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
        </select>
      </label>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => onChange({ column, direction: 'asc' })} className={`rounded border px-2 py-1 ${direction === 'asc' ? 'border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>Asc</button>
        <button type="button" onClick={() => onChange({ column, direction: 'desc' })} className={`rounded border px-2 py-1 ${direction === 'desc' ? 'border-indigo-400 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>Desc</button>
        <button type="button" onClick={() => { onChange(null); onClose(); }} className="ml-auto text-gray-400 hover:underline">Clear</button>
      </div>
    </div>
  );
}
