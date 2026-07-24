'use client';

import { useMemo } from 'react';
import { useBoardPeriod } from './useBoardPeriod';

/**
 * Merges the board-level period override into a widget's per-widget config.
 *
 * - mode === 'none':   config returned unchanged (widget's own defaults apply).
 * - mode === 'preset': config.days is overridden with the preset's day count.
 * - mode === 'custom': from + to are added to config (the server-side
 *   resolvePeriod helper prefers from/to over days when both are present).
 */
export function useWidgetConfigWithBoardPeriod(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const period = useBoardPeriod();
  return useMemo(() => {
    if (period.mode === 'none') return config;
    if (period.mode === 'preset') return { ...config, days: period.days };
    return { ...config, from: period.from, to: period.to };
  }, [config, period]);
}
