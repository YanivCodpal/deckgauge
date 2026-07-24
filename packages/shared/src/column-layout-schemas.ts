import { z } from "zod/v4";

/**
 * Per-board column layout: which columns are hidden and how wide each one is.
 * Keys are stable "column keys": built-in system columns use the fixed keys in
 * BOARD_SYSTEM_COLUMN_KEYS; custom columns use their BoardColumn.id (a uuid).
 *
 * Persisted on Board.columnLayout (nullable JSON). `hiddenSystemFields` still
 * exists for the legacy Size/Start/End/Duration toggle and is merged into
 * `hidden` when a layout is read, so older boards keep working.
 */

export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 640;

// Fixed keys for the built-in (system) columns rendered by the board grid.
export const BOARD_SYSTEM_COLUMN_KEYS = [
  "name",
  "owner",
  "assignee",
  "status",
  "startDate",
  "endDate",
  "dueDate",
  "duration",
  "source",
  "updated",
  "classification",
] as const;
export type BoardSystemColumnKey = (typeof BOARD_SYSTEM_COLUMN_KEYS)[number];

interface ColumnMeta {
  label: string;
  /** The Item column is the row anchor — it can never be hidden. */
  hideable: boolean;
  defaultWidth: number;
}

export const BOARD_COLUMN_META: Record<BoardSystemColumnKey, ColumnMeta> = {
  name: { label: "Item", hideable: false, defaultWidth: 320 },
  owner: { label: "Owner", hideable: true, defaultWidth: 110 },
  assignee: { label: "Assignee", hideable: true, defaultWidth: 110 },
  status: { label: "Status", hideable: true, defaultWidth: 120 },
  startDate: { label: "Start", hideable: true, defaultWidth: 120 },
  endDate: { label: "End", hideable: true, defaultWidth: 120 },
  dueDate: { label: "Due", hideable: true, defaultWidth: 120 },
  duration: { label: "Duration", hideable: true, defaultWidth: 110 },
  source: { label: "Source", hideable: true, defaultWidth: 96 },
  updated: { label: "Updated", hideable: true, defaultWidth: 80 },
  classification: { label: "CapEx/OpEx", hideable: true, defaultWidth: 96 },
};

/** Fallback width for a custom column with no persisted width. */
export const DEFAULT_CUSTOM_COLUMN_WIDTH = 112;

/**
 * System columns that ship hidden and are opt-in. The persisted layout only
 * records a `hidden` set, so a brand-new column would otherwise show on every
 * board that already saved a layout (its hidden set simply lacks the new key).
 * For these keys we store the toggle the other way round: presence in `hidden`
 * means "user turned it ON". This keeps a single toggle array while letting the
 * column default to hidden everywhere.
 */
export const OPT_IN_SYSTEM_COLUMNS = new Set<string>(["assignee"]);

/** Resolve a system column's visibility, honoring opt-in (default-hidden) keys. */
export function isSystemColumnVisible(key: string, hidden: Iterable<string>): boolean {
  const set = hidden instanceof Set ? hidden : new Set(hidden);
  return OPT_IN_SYSTEM_COLUMNS.has(key) ? set.has(key) : !set.has(key);
}

export const ColumnLayoutSchema = z.object({
  hidden: z.array(z.string()).default([]),
  widths: z
    .record(z.string(), z.number().int().min(MIN_COLUMN_WIDTH).max(MAX_COLUMN_WIDTH))
    .default({}),
});
export type ColumnLayout = z.infer<typeof ColumnLayoutSchema>;

export function clampColumnWidth(width: number): number {
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.round(width)));
}

/** Resolve the effective width for a column key, honoring persisted overrides. */
export function resolveColumnWidth(key: string, widths: Record<string, number>): number {
  const persisted = widths[key];
  if (typeof persisted === "number") return clampColumnWidth(persisted);
  if (key in BOARD_COLUMN_META) return BOARD_COLUMN_META[key as BoardSystemColumnKey].defaultWidth;
  return DEFAULT_CUSTOM_COLUMN_WIDTH;
}
