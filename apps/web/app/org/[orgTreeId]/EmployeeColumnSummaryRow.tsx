'use client';

import type { OrgEmployeeDto, EmployeeColumnDto } from '@deckgauge/shared';
import { isBuiltInColumn } from './EmployeeBoardRow';

type Member = { employee: OrgEmployeeDto; fieldValues: Record<string, string> };

interface EmployeeColumnSummaryRowProps {
  columns: string[];
  members: Member[];
  columnsById: Map<string, EmployeeColumnDto>;
  groupColor: string;
}

function rawValue(key: string, m: Member): string {
  if (isBuiltInColumn(key)) {
    if (key === 'salary')
      return m.employee.salaryCurrent != null ? String(m.employee.salaryCurrent) : '';
    if (key === 'manager') return m.employee.managerId ?? '';
    const v = m.employee[key as keyof OrgEmployeeDto];
    return v == null ? '' : String(v);
  }
  return m.fieldValues[key] ?? '';
}

function summarize(
  key: string,
  members: Member[],
  columnsById: Map<string, EmployeeColumnDto>
): string {
  const values = members.map((m) => rawValue(key, m)).filter((v) => v !== '');
  const isNumeric = key === 'salary' || columnsById.get(key)?.type === 'NUMBER';
  if (isNumeric) {
    const nums = values.map(Number).filter((n) => !Number.isNaN(n));
    return nums.length > 0 ? String(nums.reduce((a, b) => a + b, 0)) : '—';
  }
  return values.length > 0 ? `${values.length} filled` : '—';
}

export function EmployeeColumnSummaryRow({
  columns,
  members,
  columnsById,
  groupColor,
}: EmployeeColumnSummaryRowProps) {
  return (
    <div
      className="grid items-center bg-slate-50 border-t border-slate-200"
      style={{ gridTemplateColumns: 'var(--board-grid-cols)' }}
    >
      <div className="h-full" style={{ backgroundColor: groupColor, opacity: 0.6 }} />
      <div className="px-1 py-1.5 border-r border-slate-200" />
      {columns.map((key) => (
        <div
          key={key}
          className="px-3 py-1.5 border-r border-slate-200 text-xs font-medium text-slate-400 text-center"
        >
          {summarize(key, members, columnsById)}
        </div>
      ))}
    </div>
  );
}
