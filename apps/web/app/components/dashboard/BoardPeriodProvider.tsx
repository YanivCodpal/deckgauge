'use client';

import { createContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { presetToDays, type BoardPeriod, type PeriodPreset } from '@deckgauge/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_PRESETS: ReadonlyArray<PeriodPreset> = ['7d', '14d', '30d', '90d'];

export const BoardPeriodContext = createContext<BoardPeriod>({ mode: 'none' });

export function BoardPeriodProvider({ children }: { children: ReactNode }) {
  const search = useSearchParams();
  const value = useMemo<BoardPeriod>(() => {
    const preset = search.get('period');
    if (preset && (VALID_PRESETS as ReadonlyArray<string>).includes(preset)) {
      return { mode: 'preset', days: presetToDays(preset as PeriodPreset) };
    }
    const from = search.get('from');
    const to = search.get('to');
    if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to) && from < to) {
      return { mode: 'custom', from, to };
    }
    return { mode: 'none' };
  }, [search]);

  return <BoardPeriodContext.Provider value={value}>{children}</BoardPeriodContext.Provider>;
}
