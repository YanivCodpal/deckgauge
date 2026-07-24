export type NavMode = 'row' | 'cell' | 'edit';

export interface NavState {
  mode: NavMode;
  focusedRowId: string | null;
  focusedCellIndex: number;
  selectedRowIds: Set<string>;
}

export type NavAction =
  | { type: 'TAB_NEXT'; items: string[] }
  | { type: 'TAB_PREV'; items: string[] }
  | { type: 'ENTER_CELL'; cellCount: number }
  | { type: 'EXIT_CELL' }
  | { type: 'ENTER_EDIT' }
  | { type: 'EXIT_EDIT' }
  | { type: 'CELL_NEXT'; cellCount: number; items: string[] }
  | { type: 'CELL_PREV'; cellCount: number; items: string[] }
  | { type: 'TOGGLE_SELECT'; rowId: string }
  | { type: 'FOCUS_ROW'; rowId: string }
  | { type: 'BLUR' };

export const initialNavState: NavState = {
  mode: 'row',
  focusedRowId: null,
  focusedCellIndex: 0,
  selectedRowIds: new Set(),
};

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'TAB_NEXT': {
      const { items } = action;
      if (items.length === 0) return state;
      if (state.focusedRowId === null) {
        return { ...state, mode: 'row', focusedRowId: items[0] ?? null };
      }
      const idx = items.indexOf(state.focusedRowId);
      const nextIdx = idx === -1 ? 0 : Math.min(idx + 1, items.length - 1);
      return { ...state, mode: 'row', focusedRowId: items[nextIdx] ?? null };
    }

    case 'TAB_PREV': {
      const { items } = action;
      if (state.focusedRowId === null) return state;
      const idx = items.indexOf(state.focusedRowId);
      if (idx <= 0) return state;
      return { ...state, mode: 'row', focusedRowId: items[idx - 1] ?? null };
    }

    case 'ENTER_CELL': {
      if (state.focusedRowId === null) return state;
      return { ...state, mode: 'cell', focusedCellIndex: 0 };
    }

    case 'EXIT_CELL': {
      return { ...state, mode: 'row', focusedCellIndex: 0 };
    }

    case 'ENTER_EDIT': {
      if (state.mode !== 'cell') return state;
      return { ...state, mode: 'edit' };
    }

    case 'EXIT_EDIT': {
      if (state.mode !== 'edit') return state;
      return { ...state, mode: 'cell' };
    }

    case 'CELL_NEXT': {
      const { cellCount, items } = action;
      const lastCell = cellCount - 1;
      if (state.focusedCellIndex < lastCell) {
        return { ...state, focusedCellIndex: state.focusedCellIndex + 1 };
      }
      // At last cell — try to move to next row
      const rowIdx = state.focusedRowId !== null ? items.indexOf(state.focusedRowId) : -1;
      if (rowIdx === -1 || rowIdx >= items.length - 1) {
        // Already at last row — stay
        return state;
      }
      return { ...state, focusedRowId: items[rowIdx + 1] ?? null, focusedCellIndex: 0 };
    }

    case 'CELL_PREV': {
      const { cellCount, items } = action;
      if (state.focusedCellIndex > 0) {
        return { ...state, focusedCellIndex: state.focusedCellIndex - 1 };
      }
      // At first cell — try to move to previous row
      const rowIdx = state.focusedRowId !== null ? items.indexOf(state.focusedRowId) : -1;
      if (rowIdx <= 0) {
        // Already at first row — stay
        return state;
      }
      return {
        ...state,
        focusedRowId: items[rowIdx - 1] ?? null,
        focusedCellIndex: cellCount - 1,
      };
    }

    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedRowIds);
      if (next.has(action.rowId)) {
        next.delete(action.rowId);
      } else {
        next.add(action.rowId);
      }
      return { ...state, selectedRowIds: next };
    }

    case 'FOCUS_ROW': {
      return { ...state, mode: 'row', focusedRowId: action.rowId, focusedCellIndex: 0 };
    }

    case 'BLUR': {
      return { ...state, mode: 'row', focusedRowId: null, focusedCellIndex: 0 };
    }
  }
}
