// Weekly commit-heat helpers. A person's "heat" is a fixed-length array of
// per-ISO-week code-commit counts, oldest → newest, ending with the current
// week. Populated during org-tree sync (worker) and rendered as a sparkbar on
// the org-chart card. Pure + UTC so it is deterministic and testable.

/** Number of trailing weeks the sparkbar shows. */
export const HEAT_WEEKS = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Zero-filled heat array of the default (or given) length. */
export function emptyHeat(weeks: number = HEAT_WEEKS): number[] {
  return new Array(weeks).fill(0);
}

/** Monday 00:00:00 UTC of the ISO week containing `d`. */
export function mondayOf(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // getUTCDay: 0=Sun..6=Sat → days since Monday (Sun counts as 6).
  const daysSinceMonday = (utc.getUTCDay() + 6) % 7;
  return new Date(utc.getTime() - daysSinceMonday * DAY_MS);
}

/**
 * Slot index (0 = oldest in range, weeks-1 = current week) for the week that
 * contains `weekDateIso`, or null when it falls outside the trailing window.
 * `weekDateIso` need not be a Monday — it is normalised to its week's Monday.
 */
export function weekSlotIndex(
  weekDateIso: string,
  nowIso: string,
  weeks: number = HEAT_WEEKS,
): number | null {
  const currentMonday = mondayOf(new Date(nowIso));
  const weekMonday = mondayOf(new Date(weekDateIso));
  const diffWeeks = Math.round((currentMonday.getTime() - weekMonday.getTime()) / (7 * DAY_MS));
  const slot = weeks - 1 - diffWeeks;
  return slot >= 0 && slot < weeks ? slot : null;
}
