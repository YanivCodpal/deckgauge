'use server';

import type { WidgetScopeFlags } from '@deckgauge/shared';
import { authFetch } from './api';

export async function fetchWidgetScope(boardId: string): Promise<WidgetScopeFlags> {
  const res = await authFetch(`/boards/${boardId}/widget-scope`);
  if (!res.ok) throw new Error(`Widget scope fetch failed: ${res.status}`);
  return res.json();
}
