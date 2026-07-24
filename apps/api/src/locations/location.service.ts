import allCities from 'all-the-cities';
import { countries } from 'countries-list';
import type { LocationSuggestion } from '@deckgauge/shared';
import {
  indexCities,
  searchIndexedCities,
  type IndexedCity,
  type RawCity,
} from './location-search.js';

const countryName = (iso2: string): string =>
  (countries as Record<string, { name: string }>)[iso2]?.name ?? iso2;

// Index the full dataset once at module load (one normalization pass over
// ~138k cities). Reused across all requests. Country names are normalized here
// too so country-name queries (e.g. "South Africa") can match.
const INDEXED: IndexedCity[] = indexCities(allCities as unknown as RawCity[], countryName);

export class LocationService {
  search(query: string, limit = 8): LocationSuggestion[] {
    return searchIndexedCities(INDEXED, countryName, query, limit);
  }
}
