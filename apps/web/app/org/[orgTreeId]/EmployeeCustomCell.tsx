'use client';

import type { EmployeeColumnDto } from '@deckgauge/shared';
import { ColoredSelect } from '@deckgauge/ui';

interface Props {
  column: EmployeeColumnDto;
  value: string;
  onSave: (v: string) => void;
  onAddOption?: (value: string) => void;
}

const inputCls =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-200 focus:border-indigo-300 focus:outline-none';

export function EmployeeCustomCell({ column, value, onSave, onAddOption }: Props) {
  switch (column.type) {
    case 'NUMBER':
      return <input type="number" defaultValue={value} onBlur={(e) => onSave(e.target.value)} className={`${inputCls} w-24`} />;
    case 'DATE':
      return <input type="date" defaultValue={value ? value.slice(0, 10) : ''} onBlur={(e) => onSave(e.target.value)} className={inputCls} />;
    case 'CHECKBOX':
      return <input type="checkbox" aria-label={column.name} checked={value === 'true'} onChange={(e) => onSave(e.target.checked ? 'true' : '')} />;
    case 'DROPDOWN': {
      const raw = column.config?.options;
      const options = Array.isArray(raw) ? (raw as string[]) : [];
      return (
        <ColoredSelect
          value={value}
          options={options}
          onChange={onSave}
          ariaLabel={column.name}
          onAddOption={onAddOption}
        />
      );
    }
    case 'LINK':
    case 'TEXT':
    default:
      return <input type="text" defaultValue={value} onBlur={(e) => onSave(e.target.value)} className={inputCls} />;
  }
}
