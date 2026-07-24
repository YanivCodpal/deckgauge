// Layout geometry for the roadmap Gantt timeline.
// All horizontal positions are in pixels, measured from the start of the
// TIMELINE area (i.e. after the fixed lane-label gutter). The lane-label
// gutter offset is applied by canvas-level overlays (gridlines, today line,
// quarter headers), not by the bars themselves.

export const PX_PER_DAY = 9;
/** Width of the sticky left lane-label column. */
export const LANE_LABEL_WIDTH = 188;
/** Height of a single assignee row (the bar sits centered inside it). */
export const ROW_HEIGHT = 46;
/** Height of a scheduled bar. */
export const BAR_HEIGHT = 30;
/** Gap subtracted from a bar's width so back-to-back bars read as separate. */
export const BAR_GAP = 4;
/** Height of the group title strip inside each lane. */
export const GROUP_HEADER_HEIGHT = 34;
/** Height of the quarter header row. */
export const HEADER_HEIGHT = 52;

const DAY_MS = 24 * 60 * 60 * 1000;
const AVG_QUARTER_DAYS = 91;

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / DAY_MS;
}

export function dateToX(date: Date, startDate: Date): number {
  return daysBetween(startDate, date) * PX_PER_DAY;
}

export interface Quarter {
  label: string;
  /** x of the quarter's left edge, in timeline pixels. */
  x: number;
  widthDays: number;
  widthPx: number;
}

export function quartersFrom(startDate: Date, count: number): Quarter[] {
  const out: Quarter[] = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  for (let i = 0; i < count; i++) {
    const y = cursor.getUTCFullYear();
    const q = Math.floor(cursor.getUTCMonth() / 3) + 1;
    const next = new Date(Date.UTC(y, q * 3, 1));
    const widthDays = daysBetween(cursor, next);
    out.push({
      label: `${y} Q${q}`,
      x: dateToX(cursor, startDate),
      widthDays,
      widthPx: widthDays * PX_PER_DAY,
    });
    cursor = next;
  }
  return out;
}

/** Total timeline width (px) covered by a set of quarters. */
export function timelineWidthPx(quarters: Quarter[]): number {
  if (quarters.length === 0) return 0;
  const last = quarters[quarters.length - 1];
  return last.x + last.widthPx;
}

/**
 * How many quarter columns to draw: at least `minQuarters` (the zoom control),
 * but enough to cover `contentDays` of scheduled work so nothing is clipped.
 */
export function quarterCount(minQuarters: number, contentDays: number): number {
  return Math.max(minQuarters, Math.ceil((contentDays + 14) / AVG_QUARTER_DAYS) + 1);
}

/** Inverse of dateToX: timeline pixels (from start) → date. */
export function xToDate(x: number, startDate: Date): Date {
  const days = x / PX_PER_DAY;
  return new Date(startDate.getTime() + days * DAY_MS);
}

/** Snap a date to UTC midnight (day granularity). */
export function snapToDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
