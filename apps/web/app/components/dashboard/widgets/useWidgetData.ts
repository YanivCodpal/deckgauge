'use client';

import { useEffect, useState } from 'react';
import { fetchWidgetData } from '../../../actions/widgets';

export interface WidgetDataState<T> {
  data: T | null;
  error: Error | null;
}

// Wraps fetchWidgetData with explicit error capture so a 500 / network failure
// surfaces as a per-widget error UI rather than an unhandled promise rejection
// that bubbles up and triggers Next.js's global error overlay. Each widget
// previously did `.then(setData)` with no `.catch`, which meant one flaky
// endpoint crashed the entire dashboard.
export function useWidgetData<T>(
  boardId: string,
  widgetType: string,
  config: Record<string, unknown>
): WidgetDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // JSON.stringify on config is intentional — config is a fresh object every
  // render, so reference equality would re-fetch on every parent re-render.
  const configKey = JSON.stringify(config);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchWidgetData(boardId, widgetType, config)
      .then((result) => {
        if (!cancelled) setData(result as T);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
    // configKey is JSON.stringify(config); listing config itself would re-fetch
    // every render since callers pass a fresh object literal each time.
  }, [boardId, widgetType, configKey]);

  return { data, error };
}
