/**
 * Shared board grid-template builder. Both the main project board and the
 * org-tree employee board render their rows as CSS grids driven by a single
 * `--board-grid-cols` custom property. This computes that value plus the total
 * minimum row width, from a list of per-column specs and optional fixed
 * structural tracks (color stripe, checkbox, action menu).
 */

export interface GridColumnSpec {
  /** Resolved pixel width. For a flexing column this is its floor. */
  width: number;
  /**
   * When set, the column flexes: `minmax(width, <flex>fr)` so it fills spare
   * horizontal space but never shrinks below `width`. Omit for a fixed px track.
   */
  flex?: number;
}

export interface BoardGridOptions {
  /** Fixed leading structural tracks, in px (e.g. color stripe, checkbox). */
  leading?: number[];
  /** Fixed trailing structural tracks, in px (e.g. action-menu column). */
  trailing?: number[];
}

/**
 * Build a board's `grid-template-columns` value and the total minimum row
 * width. Every data column is a fixed px track except flexing columns (the
 * Item/name column), which become `minmax(width, <flex>fr)`. `minWidth` sums
 * every track's floor so the board can scroll horizontally once the columns
 * outgrow the viewport instead of squishing.
 */
export function buildBoardGridTemplate(
  columns: GridColumnSpec[],
  options: BoardGridOptions = {}
): { template: string; minWidth: number } {
  const tracks: string[] = [];
  let minWidth = 0;

  for (const px of options.leading ?? []) {
    tracks.push(`${px}px`);
    minWidth += px;
  }

  for (const col of columns) {
    tracks.push(col.flex != null ? `minmax(${col.width}px, ${col.flex}fr)` : `${col.width}px`);
    minWidth += col.width;
  }

  for (const px of options.trailing ?? []) {
    tracks.push(`${px}px`);
    minWidth += px;
  }

  return { template: tracks.join(' '), minWidth };
}
