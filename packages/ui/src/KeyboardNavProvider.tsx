'use client';

import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import { navReducer, initialNavState, type NavState, type NavAction } from './hooks/useKeyboardNav';

interface KeyboardNavContextValue {
  state: NavState;
  dispatch: (action: NavAction) => void;
  items: string[];
  cellCount: number;
}

const KeyboardNavContext = createContext<KeyboardNavContextValue | null>(null);

interface KeyboardNavProviderProps {
  items: string[];
  cellCount?: number;
  children: ReactNode;
}

export function KeyboardNavProvider({ items, cellCount = 4, children }: KeyboardNavProviderProps) {
  const [state, dispatch] = useReducer(navReducer, initialNavState);

  const value = useMemo(
    () => ({ state, dispatch, items, cellCount }),
    [state, items, cellCount],
  );

  return (
    <KeyboardNavContext.Provider value={value}>
      {children}
    </KeyboardNavContext.Provider>
  );
}

export function useKeyboardNavContext(): KeyboardNavContextValue {
  const ctx = useContext(KeyboardNavContext);
  if (!ctx) {
    throw new Error('useKeyboardNavContext must be used within a KeyboardNavProvider');
  }
  return ctx;
}
