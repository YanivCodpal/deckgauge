// Per-day working-hours cap for the timesheet engine.
//
// In normalized mode a person's per-day total tops out at elapsed wall-clock:
// a ticket left "In Progress" overnight/through a weekend contributes the full
// 24h of each day it spans, so the grid shows physically impossible days (24h).
// A configurable daily cap (default 8h) bounds each engineer's day to a
// realistic capacity; the day's tickets are then scaled down proportionally so
// the CapEx/OpEx split is preserved.

/** Default per-day working-hours cap applied when a tree has no explicit value. */
export const DEFAULT_DAILY_CAP_HOURS = 8;

const SECONDS_PER_HOUR = 3600;

/**
 * Resolve a tree's stored `dailyCapHours` into the cap in seconds the engine
 * applies, or `null` for "no cap".
 *
 * - `null` / `undefined` (unconfigured) → default {@link DEFAULT_DAILY_CAP_HOURS}.
 * - `0` or negative → uncapped (explicit escape hatch).
 * - positive → that many hours, in seconds.
 */
export function resolveDailyCapSeconds(dailyCapHours: number | null | undefined): number | null {
  const hours = dailyCapHours ?? DEFAULT_DAILY_CAP_HOURS;
  if (!(hours > 0)) return null;
  return hours * SECONDS_PER_HOUR;
}
