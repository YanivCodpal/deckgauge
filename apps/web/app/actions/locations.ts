'use server';

import type { LocationSuggestion, LocationSearchResponse } from '@deckgauge/shared';
import { apiRequest } from './api';

export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await apiRequest(`/locations/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as LocationSearchResponse;
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}
