import type { LocationSuggestion } from '@deckgauge/shared';

export interface RawCity {
  name: string;
  country: string; // ISO 3166-1 alpha-2
  population: number;
  loc: { coordinates: [number, number] }; // [longitude, latitude]
}
export interface IndexedCity extends RawCity {
  norm: string; // normalized city name
  normCountry: string; // normalized country display name (for country-name queries)
}

const MIN_QUERY = 2;
const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 8;

export function normalizeLocationQuery(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim();
}

export function indexCities(
  cities: RawCity[],
  countryName: (iso2: string) => string,
): IndexedCity[] {
  return cities.map((c) => ({
    ...c,
    norm: normalizeLocationQuery(c.name),
    normCountry: normalizeLocationQuery(countryName(c.country)),
  }));
}

export function searchIndexedCities(
  indexed: IndexedCity[],
  countryName: (iso2: string) => string,
  query: string,
  limit = DEFAULT_LIMIT,
): LocationSuggestion[] {
  const q = normalizeLocationQuery(query);
  if (q.length < MIN_QUERY) return [];
  const cap = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));

  // Three tiers, most specific first: city-name prefix, city-name substring,
  // then country-name match. The country tier lets a query like "South Africa"
  // (a country, absent from the city dataset) surface that country's cities.
  const cityPrefix: IndexedCity[] = [];
  const citySubstring: IndexedCity[] = [];
  const countryMatch: IndexedCity[] = [];
  for (const c of indexed) {
    if (c.norm.startsWith(q)) cityPrefix.push(c);
    else if (c.norm.includes(q)) citySubstring.push(c);
    else if (c.normCountry.includes(q)) countryMatch.push(c);
  }
  const byPopDesc = (a: IndexedCity, b: IndexedCity) => b.population - a.population;
  cityPrefix.sort(byPopDesc);
  citySubstring.sort(byPopDesc);
  countryMatch.sort(byPopDesc);

  const out: LocationSuggestion[] = [];
  const seen = new Set<string>();
  for (const c of [...cityPrefix, ...citySubstring, ...countryMatch]) {
    const label = `${c.name}, ${countryName(c.country)}`;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label,
      latitude: c.loc.coordinates[1],
      longitude: c.loc.coordinates[0],
    });
    if (out.length >= cap) break;
  }
  return out;
}
