import type { TimesheetEmployeeRow } from '@deckgauge/shared';

export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  const fixed = hours.toFixed(1);
  const trimmed = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  return `${trimmed}h`;
}

// Compact money for the capitalization cost layer: e.g. $0, $940, $12.3k, $1.2m.
// Currency-symbol is caller-supplied (defaults to '$') since the blended rate is
// a plain user-entered number, not tied to a locale/currency code.
export function formatCost(amount: number, currency = '$'): string {
  const n = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${currency}${(n / 1_000).toFixed(1)}k`;
  return `${currency}${Math.round(n)}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Human-readable label for the active period, e.g. "June 2026" or "Jun 22 – 28, 2026". */
export function formatPeriodLabel(anchorIso: string, view: 'week' | 'month' | 'year'): string {
  const d = new Date(anchorIso);
  const y = d.getUTCFullYear();
  if (view === 'year') return String(y);
  if (view === 'month') return `${MONTHS[d.getUTCMonth()]} ${y}`;

  // week: Monday (UTC) through the following Sunday
  const { from } = resolveWindow(anchorIso, 'week');
  const monday = new Date(from);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  const startMonth = MONTHS[monday.getUTCMonth()]!.slice(0, 3);
  const endMonth = MONTHS[sunday.getUTCMonth()]!.slice(0, 3);
  const start = `${startMonth} ${monday.getUTCDate()}`;
  const end =
    monday.getUTCMonth() === sunday.getUTCMonth()
      ? String(sunday.getUTCDate())
      : `${endMonth} ${sunday.getUTCDate()}`;
  return `${start} – ${end}, ${monday.getUTCFullYear()}`;
}

export function resolveWindow(
  anchorIso: string,
  view: 'week' | 'month' | 'year',
): { from: string; to: string; granularity: 'day' | 'month' } {
  const d = new Date(anchorIso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  if (view === 'year') {
    return {
      from: new Date(Date.UTC(y, 0, 1)).toISOString(),
      to: new Date(Date.UTC(y + 1, 0, 1)).toISOString(),
      granularity: 'month',
    };
  }
  if (view === 'month') {
    return {
      from: new Date(Date.UTC(y, m, 1)).toISOString(),
      to: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
      granularity: 'day',
    };
  }
  // week: back to Monday (UTC)
  const dow = new Date(Date.UTC(y, m, day)).getUTCDay(); // 0=Sun..6=Sat
  const backToMonday = (dow + 6) % 7;
  const monday = Date.UTC(y, m, day) - backToMonday * 86_400_000;
  return {
    from: new Date(monday).toISOString(),
    to: new Date(monday + 7 * 86_400_000).toISOString(),
    granularity: 'day',
  };
}

export function orderEmployeesByHierarchy(
  employees: TimesheetEmployeeRow[],
): { employee: TimesheetEmployeeRow; depth: number }[] {
  const byId = new Map(employees.map((e) => [e.employeeId, e] as const));
  const childrenOf = new Map<string | null, TimesheetEmployeeRow[]>();
  for (const e of employees) {
    // A manager not in the set makes the employee a root.
    const parentKey = e.managerId && byId.has(e.managerId) ? e.managerId : null;
    const list = childrenOf.get(parentKey);
    if (list) list.push(e);
    else childrenOf.set(parentKey, [e]);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const out: { employee: TimesheetEmployeeRow; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentKey: string | null, depth: number) => {
    for (const e of childrenOf.get(parentKey) ?? []) {
      if (visited.has(e.employeeId)) continue;
      visited.add(e.employeeId);
      out.push({ employee: e, depth });
      walk(e.employeeId, depth + 1);
    }
  };
  walk(null, 0);
  // Any employees left unvisited (in a cycle) are appended at depth 0.
  for (const e of employees) {
    if (!visited.has(e.employeeId)) {
      visited.add(e.employeeId);
      out.push({ employee: e, depth: 0 });
    }
  }
  return out;
}

export interface AggregatedTask {
  issueKey: string;
  provider: string;
  classification: string;
  title: string | null;
  byBucket: Map<string, number>;
  total: number;
}

/** Collapse an employee's per-bucket tasks into one row per issue+classification. */
export function aggregateEmployeeTasks(employee: TimesheetEmployeeRow): AggregatedTask[] {
  const map = new Map<string, AggregatedTask>();
  for (const cell of employee.cells) {
    for (const t of cell.tasks) {
      const key = `${t.issueKey}|${t.classification}`;
      let agg = map.get(key);
      if (!agg) {
        agg = {
          issueKey: t.issueKey,
          provider: t.provider,
          classification: t.classification,
          title: t.title,
          byBucket: new Map(),
          total: 0,
        };
        map.set(key, agg);
      }
      agg.byBucket.set(cell.bucketKey, (agg.byBucket.get(cell.bucketKey) ?? 0) + t.seconds);
      agg.total += t.seconds;
      if (agg.title === null && t.title !== null) agg.title = t.title;
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Sum each bucket's seconds across every employee — the grid's footer row. */
export function columnTotals(
  employees: TimesheetEmployeeRow[],
  buckets: string[],
): Map<string, number> {
  const totals = new Map<string, number>(buckets.map((b) => [b, 0]));
  for (const e of employees) {
    for (const cell of e.cells) {
      if (totals.has(cell.bucketKey)) {
        totals.set(cell.bucketKey, totals.get(cell.bucketKey)! + cell.seconds);
      }
    }
  }
  return totals;
}

export interface ClassificationSplit {
  capexSeconds: number;
  opexSeconds: number;
  unclassifiedSeconds: number;
  /** CapEx as a share of classified (CapEx + OpEx) work; 0 when none is classified. */
  capexPct: number;
}

/** Break an employee's logged time into CapEx / OpEx / Unclassified totals. */
export function employeeSplit(employee: TimesheetEmployeeRow): ClassificationSplit {
  let capexSeconds = 0;
  let opexSeconds = 0;
  let unclassifiedSeconds = 0;
  for (const cell of employee.cells) {
    for (const t of cell.tasks) {
      if (t.classification === 'CAPEX') capexSeconds += t.seconds;
      else if (t.classification === 'OPEX') opexSeconds += t.seconds;
      else unclassifiedSeconds += t.seconds;
    }
  }
  const classified = capexSeconds + opexSeconds;
  const capexPct = classified > 0 ? (capexSeconds / classified) * 100 : 0;
  return { capexSeconds, opexSeconds, unclassifiedSeconds, capexPct };
}
