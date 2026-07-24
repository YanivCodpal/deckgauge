'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Top-level entity types the sidebar rail switches between. Each maps to one
 * rail icon and one content panel. Adding a type is one entry here plus a rail
 * button and a panel — never another stacked section fighting for height.
 */
export type SidebarType =
  | 'favorites'
  | 'boards'
  | 'roadmaps'
  | 'timesheets'
  | 'orgTrees'
  | 'comparisons';

/** Collapsible groups *within* a panel (e.g. Favorites / Hidden inside Boards). */
export type SidebarSection = 'favorites' | 'hidden';

interface SidebarUiState {
  collapsed: boolean;
  activeType: SidebarType;
  sections: Record<SidebarSection, boolean>;
}

const STORAGE_KEY = 'vpc_sidebar_ui';

const VALID_TYPES: readonly SidebarType[] = [
  'favorites',
  'boards',
  'roadmaps',
  'timesheets',
  'orgTrees',
  'comparisons',
];

const DEFAULT_STATE: SidebarUiState = {
  collapsed: false,
  activeType: 'boards',
  sections: { favorites: true, hidden: true },
};

function readState(): SidebarUiState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SidebarUiState>;
    // Back-compat: older persisted state had no `activeType` and a wider
    // `sections` shape ({ boards, orgTrees, timesheet, ... }). Merging over the
    // defaults tolerates both without throwing.
    const activeType =
      parsed.activeType && VALID_TYPES.includes(parsed.activeType)
        ? parsed.activeType
        : DEFAULT_STATE.activeType;
    return {
      collapsed: parsed.collapsed ?? DEFAULT_STATE.collapsed,
      activeType,
      sections: { ...DEFAULT_STATE.sections, ...(parsed.sections ?? {}) },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useSidebarUiState() {
  const [state, setState] = useState<SidebarUiState>(DEFAULT_STATE);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    setState(readState());
  }, []);

  const persist = useCallback((next: SidebarUiState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode) — in-memory state still works.
    }
  }, []);

  const toggleCollapsed = useCallback(
    () => persist({ ...state, collapsed: !state.collapsed }),
    [persist, state],
  );

  const setActiveType = useCallback(
    (type: SidebarType) => {
      // Selecting a type from the rail always reveals the panel.
      persist({ ...state, activeType: type, collapsed: false });
    },
    [persist, state],
  );

  const isSectionOpen = useCallback(
    (section: SidebarSection) => state.sections[section],
    [state],
  );

  const toggleSection = useCallback(
    (section: SidebarSection) =>
      persist({
        ...state,
        sections: { ...state.sections, [section]: !state.sections[section] },
      }),
    [persist, state],
  );

  return {
    collapsed: state.collapsed,
    toggleCollapsed,
    activeType: state.activeType,
    setActiveType,
    isSectionOpen,
    toggleSection,
  };
}
