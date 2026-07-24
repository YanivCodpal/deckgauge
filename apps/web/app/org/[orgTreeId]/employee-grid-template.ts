import { clampColumnWidth } from '@deckgauge/shared';

/** Default width for the flexing `name` column (also its minimum). */
export const EMPLOYEE_NAME_COLUMN_WIDTH = 220;
/** Default width for every non-name column. */
export const EMPLOYEE_DEFAULT_COLUMN_WIDTH = 140;

/**
 * Resolve the effective pixel width for an employee-board column, honoring a
 * persisted override and clamping it to the shared min/max bounds.
 */
export function resolveEmployeeColumnWidth(
  key: string,
  widths: Record<string, number> = {}
): number {
  const persisted = widths[key];
  if (typeof persisted === 'number') return clampColumnWidth(persisted);
  return key === 'name' ? EMPLOYEE_NAME_COLUMN_WIDTH : EMPLOYEE_DEFAULT_COLUMN_WIDTH;
}
