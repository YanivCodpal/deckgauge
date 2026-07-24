'use client';

import { useState, useTransition } from 'react';
import type { OrgEmployeeDto } from '@deckgauge/shared';
import { addExistingMembers, addNewBoardEmployee } from '../../actions/employee-boards';

interface Props {
  boardId: string;
  allEmployees: OrgEmployeeDto[];
  memberEmployeeIds: string[];
  onChanged: () => void;
}

export function AddToBoardControls({ boardId, allEmployees, memberEmployeeIds, onChanged }: Props) {
  const [mode, setMode] = useState<'none' | 'existing' | 'new'>('none');
  const [name, setName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const candidates = allEmployees.filter((e) => !memberEmployeeIds.includes(e.id) && !e.isDeparted);

  const createNew = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      await addNewBoardEmployee(boardId, { name: name.trim(), managerId: managerId === '' ? null : managerId });
      setName('');
      setManagerId('');
      setMode('none');
      onChanged();
    });
  };

  const addExisting = () => {
    if (picked.size === 0) return;
    startTransition(async () => {
      await addExistingMembers(boardId, [...picked]);
      setPicked(new Set());
      setMode('none');
      onChanged();
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('existing')} className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">＋ Add existing</button>
        <button type="button" onClick={() => setMode('new')} className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">＋ Add new employee</button>
      </div>

      {mode === 'new' && (
        <div className="flex flex-wrap items-end gap-2 rounded border border-gray-200 p-2">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">Manager</span>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
              <option value="">— none (root) —</option>
              {allEmployees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </label>
          <button type="button" onClick={createNew} className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">Create</button>
        </div>
      )}

      {mode === 'existing' && (
        <div className="rounded border border-gray-200 p-2">
          <div className="max-h-48 overflow-auto">
            {candidates.length === 0 && <p className="text-gray-400">Everyone is already on this board.</p>}
            {candidates.map((e) => (
              <label key={e.id} className="flex items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  checked={picked.has(e.id)}
                  onChange={(ev) =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (ev.target.checked) next.add(e.id);
                      else next.delete(e.id);
                      return next;
                    })
                  }
                />
                {e.name}
              </label>
            ))}
          </div>
          <button type="button" onClick={addExisting} className="mt-1 rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">Add selected</button>
        </div>
      )}
    </div>
  );
}
