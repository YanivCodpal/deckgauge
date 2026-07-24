'use client';

import type { ReactNode } from 'react';
import type { OrgEmployeeDto, EmployeeColumnDto, EmployeeBoardColumnKey } from '@deckgauge/shared';
import { ColoredSelect } from '@deckgauge/ui';
import { ManagerCell } from './ManagerCell';
import { EmployeeCustomCell } from './EmployeeCustomCell';
import { LocationCell } from './LocationCell';
import { COLUMN_LABELS } from './EmployeeColumnManager';
import { rankBadgeView } from './employee-presentation';
import { appendColumnOption } from '../../actions/employee-boards';

type Member = {
  id: string;
  position: number;
  employee: OrgEmployeeDto;
  fieldValues: Record<string, string>;
};

export function isBuiltInColumn(k: string): k is EmployeeBoardColumnKey {
  return k in COLUMN_LABELS;
}

const inputCls =
  'w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-gray-200 focus:border-indigo-300 focus:outline-none';

export function renderEmployeeCell(
  key: string,
  m: Member,
  allEmployees: OrgEmployeeDto[],
  onBlur: (employeeId: string, key: string, value: string) => void,
  onSalaryBlur: (employeeId: string, value: string) => void,
  onChanged: () => void,
  columnsById: Map<string, EmployeeColumnDto>,
  onCustomSave: (employeeId: string, columnId: string, value: string) => void,
  onManagerChange: (employeeId: string, managerId: string | null) => void,
  onOpenRanking: (employeeId: string) => void
): ReactNode {
  const e = m.employee;

  if (!isBuiltInColumn(key) && columnsById.has(key)) {
    const col = columnsById.get(key)!;
    return (
      <EmployeeCustomCell
        column={col}
        value={m.fieldValues[key] ?? ''}
        onSave={(v) => onCustomSave(e.id, key, v)}
        onAddOption={
          col.type === 'DROPDOWN'
            ? (v) => {
                void appendColumnOption(col, v).then(() => onChanged());
              }
            : undefined
        }
      />
    );
  }

  switch (key as EmployeeBoardColumnKey) {
    case 'businessTitle':
    case 'email':
    case 'phone':
      return (
        <input
          type="text"
          defaultValue={(e[key as keyof OrgEmployeeDto] as string | null) ?? ''}
          onBlur={(ev) => onBlur(e.id, key, ev.target.value)}
          className={inputCls}
        />
      );
    case 'location':
      return <LocationCell value={e.location ?? ''} onSave={(v) => onBlur(e.id, 'location', v)} />;
    case 'hireDate':
      return (
        <input
          type="date"
          defaultValue={e.hireDate?.slice(0, 10) ?? ''}
          onBlur={(ev) => onBlur(e.id, key, ev.target.value)}
          className={inputCls}
        />
      );
    case 'manager':
      return (
        <ManagerCell
          employeeId={e.id}
          managerId={e.managerId}
          allEmployees={allEmployees}
          onChanged={onChanged}
          onChange={onManagerChange}
        />
      );
    case 'salary':
      return (
        <input
          type="number"
          defaultValue={e.salaryCurrent ?? ''}
          onBlur={(ev) => onSalaryBlur(e.id, ev.target.value)}
          className={'w-24 ' + inputCls}
        />
      );
    case 'employeeType':
      return (
        <ColoredSelect
          ariaLabel="Employee type"
          value={e.employeeType ?? ''}
          options={['PERMANENT', 'CONTRACTOR']}
          onChange={(v) => onBlur(e.id, 'employeeType', v)}
        />
      );
    case 'timeType':
      return (
        <ColoredSelect
          ariaLabel="Time type"
          value={e.timeType ?? ''}
          options={['FULL_TIME', 'PART_TIME']}
          onChange={(v) => onBlur(e.id, 'timeType', v)}
        />
      );
    case 'rating': {
      // Clicking opens the drawer's Ranking tab (the full score breakdown). The
      // value itself is read-only — the leaderboard is API-computed, not editable.
      const r = e.ranking;
      const badge = r ? rankBadgeView(r) : null;
      return (
        <button
          type="button"
          onClick={() => onOpenRanking(e.id)}
          aria-label={`Open ranking for ${e.name}`}
          title={r ? `Rank ${r.rank} of ${r.totalRanked} · score ${r.score}` : 'Not ranked'}
          className="cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {r && badge ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.emoji && <span aria-hidden="true">{badge.emoji}</span>}
              <span>{badge.label}</span>
              <span className="tabular-nums opacity-70">{r.score}</span>
            </span>
          ) : (
            <span className="text-slate-300 hover:text-slate-500">—</span>
          )}
        </button>
      );
    }
    default:
      return null;
  }
}
