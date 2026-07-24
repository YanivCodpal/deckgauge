import type {
  GridCell,
  ReportCell,
  TimesheetEmployeeRow,
  TimesheetCellDto,
  TimesheetTaskDto,
} from '@deckgauge/shared';

export interface EmployeeMeta {
  id: string;
  name: string;
  role: string | null;
  managerId: string | null;
}

function capexPct(capex: number, opex: number): number {
  const denom = capex + opex;
  return denom === 0 ? 0 : (capex / denom) * 100;
}

/** Group flat GridCells into per-employee rows with per-bucket task breakdowns. */
export function shapeGrid(
  cells: GridCell[],
  employees: EmployeeMeta[],
  titleByIssueKey: Map<string, string> = new Map(),
): { buckets: string[]; employees: TimesheetEmployeeRow[] } {
  const bucketSet = new Set<string>();
  const byEmp = new Map<string, Map<string, { seconds: number; tasks: TimesheetTaskDto[] }>>();

  for (const c of cells) {
    bucketSet.add(c.bucketKey);
    let buckets = byEmp.get(c.employeeId);
    if (!buckets) {
      buckets = new Map();
      byEmp.set(c.employeeId, buckets);
    }
    let cell = buckets.get(c.bucketKey);
    if (!cell) {
      cell = { seconds: 0, tasks: [] };
      buckets.set(c.bucketKey, cell);
    }
    cell.seconds += c.seconds;
    cell.tasks.push({
      issueKey: c.issueKey,
      provider: c.provider,
      classification: c.classification,
      seconds: c.seconds,
      title: titleByIssueKey.get(c.issueKey) ?? null,
    });
  }

  const buckets = [...bucketSet].sort();
  const rows: TimesheetEmployeeRow[] = employees.map((e) => {
    const bucketMap = byEmp.get(e.id);
    const cellList: TimesheetCellDto[] = bucketMap
      ? [...bucketMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([bucketKey, v]) => ({ bucketKey, seconds: v.seconds, tasks: v.tasks }))
      : [];
    return { employeeId: e.id, name: e.name, role: e.role, managerId: e.managerId, cells: cellList };
  });

  return { buckets, employees: rows };
}

interface ClassTotals {
  capexSeconds: number;
  opexSeconds: number;
  unclassifiedSeconds: number;
}

function addToTotals(t: ClassTotals, classification: string, seconds: number): void {
  if (classification === 'CAPEX') t.capexSeconds += seconds;
  else if (classification === 'OPEX') t.opexSeconds += seconds;
  else t.unclassifiedSeconds += seconds;
}

/** Aggregate report cells into totals + per-bucket series, and grid cells into per-group rows. */
export function shapeReport(
  reportCells: ReportCell[],
  gridCells: GridCell[],
  employees: EmployeeMeta[],
  groupBy?: 'team' | 'role' | 'person',
): {
  totals: ClassTotals & { capexPct: number };
  byBucket: {
    bucketKey: string;
    capexSeconds: number;
    opexSeconds: number;
    unclassifiedSeconds: number;
  }[];
  byGroup: {
    group: string;
    capexSeconds: number;
    opexSeconds: number;
    unclassifiedSeconds: number;
    capexPct: number;
  }[];
} {
  const totals: ClassTotals = { capexSeconds: 0, opexSeconds: 0, unclassifiedSeconds: 0 };
  const bucketMap = new Map<string, ClassTotals>();
  for (const c of reportCells) {
    addToTotals(totals, c.classification, c.seconds);
    let b = bucketMap.get(c.bucketKey);
    if (!b) {
      b = { capexSeconds: 0, opexSeconds: 0, unclassifiedSeconds: 0 };
      bucketMap.set(c.bucketKey, b);
    }
    addToTotals(b, c.classification, c.seconds);
  }
  const byBucket = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucketKey, v]) => ({ bucketKey, ...v }));

  const byGroup: {
    group: string;
    capexSeconds: number;
    opexSeconds: number;
    unclassifiedSeconds: number;
    capexPct: number;
  }[] = [];
  if (groupBy) {
    const empById = new Map(employees.map((e) => [e.id, e] as const));
    const groupKeyFor = (employeeId: string): string => {
      const e = empById.get(employeeId);
      if (!e) return '(unknown)';
      if (groupBy === 'role') return e.role ?? '(none)';
      if (groupBy === 'person') return e.name;
      const mgr = e.managerId ? empById.get(e.managerId) : undefined;
      return mgr ? mgr.name : '(no manager)';
    };
    const groups = new Map<string, ClassTotals>();
    for (const c of gridCells) {
      const key = groupKeyFor(c.employeeId);
      let g = groups.get(key);
      if (!g) {
        g = { capexSeconds: 0, opexSeconds: 0, unclassifiedSeconds: 0 };
        groups.set(key, g);
      }
      addToTotals(g, c.classification, c.seconds);
    }
    for (const [group, v] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      byGroup.push({ group, ...v, capexPct: capexPct(v.capexSeconds, v.opexSeconds) });
    }
  }

  return {
    totals: { ...totals, capexPct: capexPct(totals.capexSeconds, totals.opexSeconds) },
    byBucket,
    byGroup,
  };
}
