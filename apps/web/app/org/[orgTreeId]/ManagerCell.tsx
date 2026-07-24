'use client';

import { useState, useTransition } from 'react';
import type { OrgEmployeeDto } from '@deckgauge/shared';
import { setEmployeeManager } from '../../actions/employee-boards';

interface Props {
  employeeId: string;
  managerId: string | null;
  allEmployees: OrgEmployeeDto[];
  onChanged: () => void;
  onChange?: (employeeId: string, managerId: string | null) => void;
}

export function ManagerCell({ employeeId, managerId, allEmployees, onChanged, onChange: onChangeProp }: Props) {
  const [value, setValue] = useState(managerId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const options = allEmployees.filter((e) => e.id !== employeeId);

  const onChange = (next: string) => {
    setValue(next);
    setError(null);
    if (onChangeProp) {
      onChangeProp(employeeId, next === '' ? null : next);
      return;
    }
    const prev = value;
    startTransition(async () => {
      const res = await setEmployeeManager(employeeId, next === '' ? null : next);
      if (!res.ok) {
        setValue(prev);
        setError(res.cycle ? 'Would create a reporting cycle' : 'Could not update manager');
        return;
      }
      onChanged();
    });
  };

  return (
    <div>
      <select
        aria-label="Manager"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-200 focus:border-indigo-300 focus:outline-none"
      >
        <option value="">— none (root) —</option>
        {options.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
