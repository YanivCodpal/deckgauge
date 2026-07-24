import type { TimesheetGridResponse } from '@deckgauge/shared';
import { aggregateEmployeeTasks } from './timesheet-ui';

function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

function classificationLabel(c: string): string {
  if (c === 'CAPEX') return 'CapEx';
  if (c === 'OPEX') return 'OpEx';
  return '';
}

export function buildGridCsv(grid: TimesheetGridResponse): string {
  const rows: string[] = [];

  // Header
  rows.push(['Engineer', 'Role', ...grid.buckets, 'Total'].join(','));

  // Employee rows + indented per-task rows
  for (const emp of grid.employees) {
    const cellMap = new Map(emp.cells.map((c) => [c.bucketKey, c.seconds]));
    const bucketCols = grid.buckets.map((b) => hours(cellMap.get(b) ?? 0));
    const totalSecs = emp.cells.reduce((sum, c) => sum + c.seconds, 0);
    rows.push([quote(emp.name), quote(emp.role ?? ''), ...bucketCols, hours(totalSecs)].join(','));

    for (const t of aggregateEmployeeTasks(emp)) {
      const label = t.title ? `${t.issueKey} — ${t.title}` : t.issueKey;
      const taskCols = grid.buckets.map((b) => (t.byBucket.has(b) ? hours(t.byBucket.get(b)!) : ''));
      rows.push(
        [quote(`  ${label}`), quote(classificationLabel(t.classification)), ...taskCols, hours(t.total)].join(','),
      );
    }
  }

  // Unmatched rows
  for (const u of grid.unmatched) {
    const emptyCols = grid.buckets.map(() => '');
    rows.push([quote(`Unmatched: ${u.assignee}`), quote('(unmatched)'), ...emptyCols, hours(u.seconds)].join(','));
  }

  return rows.join('\n');
}
