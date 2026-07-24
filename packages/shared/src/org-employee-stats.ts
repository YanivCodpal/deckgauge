import type { EmployeeStats } from './org-tree-schemas';

export const ACTIVE_WINDOW_DAYS = 90;
export const UNMAPPED = '(unmapped)';

export interface MatchedActivityRow {
  employeeId: string;
  boards: string[];
  isAssignment: boolean;
  contributedCode: boolean;
  lastTs: string | null;
  boardNames: Record<string, string>;
}

export function isWithinActiveWindow(ts: string | null, nowIso: string): boolean {
  if (!ts) return false;
  const ms = new Date(nowIso).getTime() - new Date(ts).getTime();
  return ms <= ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000 && ms >= 0;
}

function maxTs(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function reduceEmployeeSnapshot(
  rows: MatchedActivityRow[],
  nowIso: string
): {
  matched: boolean;
  isActive: boolean;
  hasAssignment: boolean;
  lastContributionAt: string | null;
  stats: EmployeeStats;
} {
  const boardAcc = new Map<string, { name: string; code: boolean; assign: boolean; last: string | null }>();
  const other = { contributedCode: false, lastContributionAt: null as string | null };
  let hasAssignment = false;
  let lastCode: string | null = null;

  for (const r of rows) {
    if (r.isAssignment) hasAssignment = true;
    if (r.contributedCode) lastCode = maxTs(lastCode, r.lastTs);
    for (const b of r.boards) {
      if (b === UNMAPPED) {
        if (r.contributedCode) {
          other.contributedCode = true;
          other.lastContributionAt = maxTs(other.lastContributionAt, r.lastTs);
        }
        continue;
      }
      const cur = boardAcc.get(b) ?? { name: r.boardNames[b] ?? b, code: false, assign: false, last: null };
      if (r.contributedCode) {
        cur.code = true;
        cur.last = maxTs(cur.last, r.lastTs);
      }
      if (r.isAssignment) cur.assign = true;
      boardAcc.set(b, cur);
    }
  }

  const boards = [...boardAcc.entries()]
    .map(([boardId, v]) => ({
      boardId, boardName: v.name, contributedCode: v.code, hasAssignment: v.assign, lastContributionAt: v.last,
    }))
    .sort((a, b) => a.boardName.localeCompare(b.boardName));

  return {
    matched: rows.length > 0,
    isActive: isWithinActiveWindow(lastCode, nowIso),
    hasAssignment,
    lastContributionAt: lastCode,
    stats: { boards, other },
  };
}
