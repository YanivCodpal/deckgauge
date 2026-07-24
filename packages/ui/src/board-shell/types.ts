import type { ComponentType, CSSProperties, ReactNode } from 'react';

/**
 * Props passed to a consumer-supplied row wrapper. The wrapper spreads
 * `className`/`style` onto its root element and renders `children` (the shell's
 * stripe + checkbox + cells). This is how a board makes its rows draggable
 * without this package depending on any drag library.
 */
export interface ShellRowWrapperProps<Row> {
  row: Row;
  rowKey: string;
  selected: boolean;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}

/**
 * A single column in the generic board shell. Domain boards (project board,
 * org-tree employee board) map their own column models to these and supply a
 * `renderCell` that knows how to render each cell.
 */
export interface ShellColumn {
  /** Stable key used for sort/resize and passed back to renderCell. */
  key: string;
  /** Header label. */
  label: string;
  /** Resolved pixel width (floor width for a flexing column). */
  width: number;
  /** When set, the column flexes: minmax(width, <flex>fr). The Item/name column. */
  flex?: number;
  /** Sticky-left column (kept visible while the board scrolls horizontally). */
  pinned?: boolean;
  /** Whether clicking the header sorts by this column. */
  sortable?: boolean;
  /** Header + cell text alignment (default 'center'; the name column is 'left'). */
  align?: 'left' | 'center';
}

export interface ShellSort {
  key: string;
  direction: 'asc' | 'desc';
}

/** Row-selection wiring. Omit to render a board with no selection checkboxes. */
export interface ShellSelection {
  isSelected: (rowKey: string) => boolean;
  onToggle: (rowKey: string, selected: boolean) => void;
  /** Accessible label for a row's checkbox (defaults to `Select row <key>`). */
  rowLabel?: (rowKey: string) => string;
  /** Tri-state of the group's visible rows for the select-all checkbox. */
  selectAllState: 'none' | 'some' | 'all';
  onSelectAll: (select: boolean) => void;
}

export interface BoardShellProps<Row> {
  columns: ShellColumn[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /**
   * Optional React reconciliation key, when it must differ from `rowKey` (e.g.
   * to force a remount while keeping the stable logical key for drag/selection).
   * Defaults to `rowKey`.
   */
  rowRenderKey?: (row: Row) => string;
  renderCell: (row: Row, columnKey: string) => ReactNode;
  /**
   * Optional wrapper component for each data row. Defaults to a plain <div>.
   * Consumers needing draggable rows pass a component that calls their drag hook
   * and spreads the provided className/style onto its element.
   */
  RowComponent?: ComponentType<ShellRowWrapperProps<Row>>;
  groupColor?: string;
  /** Persisted per-column widths; drives live width while resizing. */
  columnWidths?: Record<string, number>;
  onColumnResize?: (key: string, width: number) => void;
  sort?: ShellSort | null;
  onSort?: (key: string) => void;
  selection?: ShellSelection;
  /** When provided, an inline "add row" appears under the rows. */
  onAddRow?: (name: string) => void;
  /** Optional summary row content, rendered under the rows using the same grid. */
  renderSummary?: (rows: Row[]) => ReactNode;
  /** Fixed trailing structural tracks in px (e.g. [28] for the main board's action menu). */
  trailing?: number[];
  /** Message shown when there are no rows. */
  emptyLabel?: string;
}
