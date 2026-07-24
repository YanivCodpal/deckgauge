'use client';

import { useState } from 'react';
import type { EmployeeBoardColumnKey, EmployeeFilterRule } from '@deckgauge/shared';

interface Props {
  columns: { key: EmployeeBoardColumnKey; label: string }[];
  rules: EmployeeFilterRule[];
  onChange: (r: EmployeeFilterRule[]) => void;
  onClose: () => void;
}

const CONDITIONS = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is empty' },
];

export function EmployeeFilterPanel({ columns, rules, onChange }: Props) {
  const [local, setLocal] = useState<EmployeeFilterRule[]>(rules);

  const update = (next: EmployeeFilterRule[]) => {
    setLocal(next);
    onChange(next);
  };
  const addRule = () =>
    update([...local, { column: columns[0]?.key ?? 'name', condition: 'is', value: '' }]);
  const patch = (i: number, p: Partial<EmployeeFilterRule>) =>
    update(local.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const remove = (i: number) => update(local.filter((_, idx) => idx !== i));

  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-sm shadow">
      {local.map((rule, i) => (
        <div key={i} className="mb-2 flex items-center gap-1">
          <select aria-label="Filter column" value={rule.column} onChange={(e) => patch(i, { column: e.target.value })} className="rounded border border-gray-300 px-1 py-0.5">
            {columns.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
          </select>
          <select aria-label="Filter condition" value={rule.condition} onChange={(e) => patch(i, { condition: e.target.value })} className="rounded border border-gray-300 px-1 py-0.5">
            {CONDITIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
          {rule.condition !== 'is_empty' && (
            <input aria-label="Filter value" value={rule.value} onChange={(e) => patch(i, { value: e.target.value })} className="rounded border border-gray-300 px-1 py-0.5" />
          )}
          <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">×</button>
        </div>
      ))}
      <button type="button" onClick={addRule} className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">＋ Add filter</button>
    </div>
  );
}
