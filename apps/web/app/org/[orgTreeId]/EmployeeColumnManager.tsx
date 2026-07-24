'use client';

import { useState, useEffect } from 'react';
import {
  DEFAULT_COLUMN_ORDER,
  type EmployeeBoardColumnKey,
  type EmployeeBoardColumnConfig,
  type EmployeeColumnDto,
  type EmployeeColumnType,
} from '@deckgauge/shared';
import { createEmployeeColumn, deleteEmployeeColumn } from '../../actions/employee-boards';

export const COLUMN_LABELS: Record<EmployeeBoardColumnKey, string> = {
  name: 'Name',
  businessTitle: 'Title',
  email: 'Email',
  manager: 'Manager',
  hireDate: 'Start date',
  employeeType: 'Type',
  timeType: 'Time type',
  location: 'Location',
  phone: 'Phone',
  salary: 'Salary',
  rating: 'Rating',
};

const COLUMN_TYPES: EmployeeColumnType[] = [
  'TEXT',
  'NUMBER',
  'DATE',
  'CHECKBOX',
  'DROPDOWN',
  'LINK',
];

interface Props {
  boardId: string;
  columnConfig: EmployeeBoardColumnConfig | null;
  canSeeSalary: boolean;
  columns: EmployeeColumnDto[];
  // The manager only owns order + visibility. Column widths are merged in by the
  // canvas so editing columns never wipes a resize.
  onSave: (config: Pick<EmployeeBoardColumnConfig, 'order' | 'hidden'>) => void;
  onClose: () => void;
  onColumnsChanged: () => void;
}

export function EmployeeColumnManager({
  boardId,
  columnConfig,
  canSeeSalary,
  columns,
  onSave,
  onClose,
  onColumnsChanged,
}: Props) {
  const builtInKeys = DEFAULT_COLUMN_ORDER.filter((k) => canSeeSalary || k !== 'salary');
  const customIds = columns.map((c) => c.id);

  const baseOrder: string[] = columnConfig?.order?.length
    ? [
        ...columnConfig.order.filter(
          (k) => builtInKeys.includes(k as EmployeeBoardColumnKey) || customIds.includes(k)
        ),
        ...[...builtInKeys, ...customIds].filter((k) => !columnConfig.order.includes(k)),
      ]
    : [...builtInKeys, ...customIds];

  const [order, setOrder] = useState<string[]>(baseOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set(columnConfig?.hidden ?? []));

  const isBuiltIn = (k: string): k is EmployeeBoardColumnKey => k in COLUMN_LABELS;

  // Keep the working order list in sync with the live columns prop so columns
  // created from this panel (or elsewhere) immediately appear with hide/delete.
  useEffect(() => {
    const validCustom = new Set(columns.map((c) => c.id));
    setOrder((prev) => {
      const next = [
        ...prev.filter((k) => isBuiltIn(k) || validCustom.has(k)),
        ...columns.map((c) => c.id).filter((id) => !prev.includes(id)),
      ];
      // Avoid a state update if nothing changed (prevents render loops).
      return next.length === prev.length && next.every((k, i) => k === prev[i]) ? prev : next;
    });
  }, [columns]);

  // Add-column form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<EmployeeColumnType>('TEXT');
  const [newOptions, setNewOptions] = useState('');

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const toggle = (k: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const config =
      newType === 'DROPDOWN'
        ? {
            options: newOptions
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : undefined;
    void createEmployeeColumn(boardId, { name, type: newType, config }).then(() => {
      onColumnsChanged();
      setNewName('');
      setNewType('TEXT');
      setNewOptions('');
      setShowAddForm(false);
    });
  };

  const handleDelete = (id: string) => {
    void deleteEmployeeColumn(id).then(() => {
      onColumnsChanged();
    });
  };

  const labelFor = (k: string) =>
    isBuiltIn(k) ? COLUMN_LABELS[k] : (columns.find((c) => c.id === k)?.name ?? k);

  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-sm shadow">
      {order.map((k, i) => (
        <div key={k} className="flex items-center gap-2 py-0.5">
          <input
            type="checkbox"
            aria-label={labelFor(k)}
            checked={!hidden.has(k)}
            onChange={() => toggle(k)}
          />
          <span className="flex-1">{labelFor(k)}</span>
          <button
            type="button"
            aria-label={`Move ${labelFor(k)} up`}
            onClick={() => move(i, -1)}
            className="text-gray-400 hover:text-gray-700"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${labelFor(k)} down`}
            onClick={() => move(i, 1)}
            className="text-gray-400 hover:text-gray-700"
          >
            ↓
          </button>
          {!isBuiltIn(k) && (
            <button
              type="button"
              aria-label={`Delete ${labelFor(k)}`}
              onClick={() => handleDelete(k)}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {!showAddForm && (
        <button
          type="button"
          aria-label="Add column"
          onClick={() => setShowAddForm(true)}
          className="mt-2 w-full rounded border border-dashed border-gray-300 py-1 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          ＋ Add column
        </button>
      )}

      {showAddForm && (
        <div className="mt-2 space-y-2 rounded border border-gray-200 p-2">
          <div>
            <label className="mb-0.5 block text-xs text-gray-500" htmlFor="ecm-col-name">
              Column name
            </label>
            <input
              id="ecm-col-name"
              aria-label="Column name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-indigo-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-gray-500" htmlFor="ecm-col-type">
              Column type
            </label>
            <select
              id="ecm-col-type"
              aria-label="Column type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as EmployeeColumnType)}
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-indigo-300 focus:outline-none"
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {newType === 'DROPDOWN' && (
            <div>
              <label className="mb-0.5 block text-xs text-gray-500" htmlFor="ecm-col-options">
                Options (one per line)
              </label>
              <textarea
                id="ecm-col-options"
                aria-label="Dropdown options"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-indigo-300 focus:outline-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Create column"
              onClick={handleCreate}
              className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
            >
              Create column
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewType('TEXT');
                setNewOptions('');
              }}
              className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onSave({ order, hidden: [...hidden] });
          onClose();
        }}
        className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
      >
        Save columns
      </button>
    </div>
  );
}
