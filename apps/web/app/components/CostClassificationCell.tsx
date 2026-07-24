'use client';

import { patchProject } from '../actions/projects';

interface CostClassificationCellProps {
  projectId: string;
  boardId: string;
  value: 'CAPEX' | 'OPEX' | null;
  // When provided (board context), the change is routed through the board's
  // bulk-selection handler so a multi-row selection fans out. When absent, the
  // cell falls back to patching just its own project.
  onChange?: (value: 'CAPEX' | 'OPEX' | null) => void;
}

export function CostClassificationCell({
  projectId,
  boardId,
  value,
  onChange: onChangeProp,
}: CostClassificationCellProps) {
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value === '' ? null : (e.target.value as 'CAPEX' | 'OPEX');
    if (onChangeProp) {
      onChangeProp(next);
      return;
    }
    void patchProject(projectId, { costClassification: next }, boardId);
  }

  return (
    <select
      aria-label="CapEx/OpEx classification"
      className="rounded border border-gray-200 bg-transparent px-2 py-1 text-sm"
      value={value ?? ''}
      onChange={onChange}
    >
      <option value="">—</option>
      <option value="CAPEX">CapEx</option>
      <option value="OPEX">OpEx</option>
    </select>
  );
}
