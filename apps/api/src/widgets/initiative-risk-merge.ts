// Merge synced source initiatives (Jira epics / GitHub milestones, from
// ClickHouse) with the board's manually-editable Due date (Postgres Project).
// Board wins: a board due date overrides the synced deadline for the same
// initiative (matched by name), and a board project with a due date but no
// synced source row becomes a board-native initiative. Done rows are excluded.
// Pure + framework-free so it is unit-tested directly.

export type InitiativeRiskStatus = 'on_track' | 'at_risk' | 'overdue';
export type InitiativeSource = 'jira' | 'github';

export interface SourceInitiativeRow {
  name: string;
  /** 'YYYY-MM-DD' */
  due_date: string;
  status: string;
  source: InitiativeSource;
}

export interface BoardInitiativeProject {
  name: string;
  status: string;
  dueDate: Date | null;
  jiraKey: string | null;
  githubIssueId: string | null;
}

export interface InitiativeRow {
  name: string;
  due_date: string;
  days_until_due: number;
  status: InitiativeRiskStatus;
  source: InitiativeSource;
}

const DONE_STATES = new Set(['done', 'closed', 'resolved', 'completed']);
const isDone = (status: string): boolean => DONE_STATES.has(status.toLowerCase());

const MS_PER_DAY = 86_400_000;

/** Date → 'YYYY-MM-DD' (UTC, matching the source rows' date-only format). */
function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mergeInitiativeRows(
  sourceRows: SourceInitiativeRow[],
  boardProjects: BoardInitiativeProject[],
  now: Date,
  horizonDays: number,
): InitiativeRow[] {
  // Merge by initiative name. Seed with synced rows, then let board due dates
  // override (and add board-native rows). Board status wins for done-ness so a
  // completed board item drops out even if the synced status lags.
  const merged = new Map<string, { due_date: string; status: string; source: InitiativeSource }>();

  for (const r of sourceRows) {
    merged.set(r.name, { due_date: r.due_date, status: r.status, source: r.source });
  }

  for (const p of boardProjects) {
    if (!p.dueDate) continue; // the board contributes only when a date is set
    const derived: InitiativeSource = p.jiraKey ? 'jira' : p.githubIssueId ? 'github' : 'jira';
    const existing = merged.get(p.name);
    merged.set(p.name, {
      due_date: toYmd(p.dueDate),
      status: p.status,
      source: existing?.source ?? derived,
    });
  }

  const out: InitiativeRow[] = [];
  for (const [name, m] of merged) {
    if (isDone(m.status)) continue;
    const due = new Date(m.due_date + 'T00:00:00Z');
    const daysUntilDue = Math.round((due.getTime() - now.getTime()) / MS_PER_DAY);
    const status: InitiativeRiskStatus =
      daysUntilDue < 0 ? 'overdue' : daysUntilDue <= horizonDays ? 'at_risk' : 'on_track';
    out.push({ name, due_date: m.due_date, days_until_due: daysUntilDue, status, source: m.source });
  }
  return out;
}
