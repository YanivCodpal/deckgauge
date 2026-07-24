'use client';

// Shared primitives for the P6 multi-board comparison widgets. Kept in one
// small module so the three Compare* widgets don't duplicate the board colour
// palette, the board-as-columns scorecard table, or the non-comparable /
// "best" cell treatment.

export interface ComparabilityFlag {
  comparable: boolean;
  reason?: string;
}

// Stable colour per board position — one line per board on the trend charts and
// the matching swatch in the scorecard header.
export const BOARD_COLORS = [
  '#4f46e5', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#14b8a6', // teal
  '#ec4899', // pink
] as const;

export function boardColor(index: number): string {
  return BOARD_COLORS[index % BOARD_COLORS.length];
}

export interface ScorecardColumn {
  boardId: string;
  boardName: string;
}

export type MetricDirection = 'higher_is_better' | 'lower_is_better';

export interface ScorecardRow {
  /** Comparability key used to look up the flag + colour the cells. */
  key: string;
  label: string;
  /** One rendered value per column (already formatted), plus the raw numeric
   * used to pick the "best" cell (null → excluded from best selection). */
  cells: Array<{ display: string; raw: number | null }>;
  direction: MetricDirection;
  flag: ComparabilityFlag;
}

// Index of the "best" cell in a comparable row, or -1 when it can't be picked
// (non-comparable, or fewer than two numeric cells so "best" is meaningless).
export function bestCellIndex(row: ScorecardRow): number {
  if (!row.flag.comparable) return -1;
  const numeric = row.cells
    .map((c, i) => ({ i, raw: c.raw }))
    .filter((c): c is { i: number; raw: number } => typeof c.raw === 'number');
  if (numeric.length < 2) return -1;
  const best = numeric.reduce((acc, c) => {
    if (row.direction === 'higher_is_better') return c.raw > acc.raw ? c : acc;
    return c.raw < acc.raw ? c : acc;
  });
  return best.i;
}

interface TableProps {
  columns: ScorecardColumn[];
  rows: ScorecardRow[];
}

// Board-as-columns scorecard: metric rows × board columns, "best" hint per
// comparable row, greyed cells for non-comparable metrics (reason surfaced as a
// tooltip). Mirrors the 2026-07 brief's comparison table shape.
export function CompareScorecardTable({ columns, rows }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-2 pr-3 text-left text-slate-500 font-medium">Metric</th>
            {columns.map((col, i) => (
              <th
                key={col.boardId}
                className="py-2 px-3 text-right text-slate-700 font-semibold whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-1.5 justify-end">
                  <span
                    aria-hidden="true"
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: boardColor(i) }}
                  />
                  {col.boardName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = bestCellIndex(row);
            const nonComparable = !row.flag.comparable;
            return (
              <tr key={row.key} className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-700">
                  {row.label}
                  {nonComparable && (
                    <span
                      data-noncomparable-badge
                      title={row.flag.reason}
                      className="ml-1.5 text-[10px] uppercase tracking-wide text-amber-500"
                    >
                      n/c
                    </span>
                  )}
                </td>
                {row.cells.map((cell, i) => {
                  const isBest = i === best;
                  return (
                    <td
                      key={columns[i]?.boardId ?? i}
                      data-noncomparable={nonComparable ? 'true' : undefined}
                      data-best={isBest ? 'true' : undefined}
                      title={nonComparable ? row.flag.reason : undefined}
                      className={[
                        'py-2 px-3 text-right font-mono tabular-nums',
                        nonComparable
                          ? 'text-slate-600 italic'
                          : isBest
                            ? 'text-emerald-600 font-semibold'
                            : 'text-slate-800',
                      ].join(' ')}
                    >
                      {cell.display}
                      {isBest && !nonComparable && (
                        <span aria-hidden="true" className="ml-1 text-emerald-500">
                          ★
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const fmtPct = (v: number | null): { display: string; raw: number | null } => ({
  display: v === null ? '—' : `${v}%`,
  raw: v,
});
export const fmtHrs = (v: number | null): { display: string; raw: number | null } => ({
  display: v === null ? '—' : `${v} h`,
  raw: v,
});
export const fmtNum = (v: number | null): { display: string; raw: number | null } => ({
  display: v === null ? '—' : `${v}`,
  raw: v,
});
