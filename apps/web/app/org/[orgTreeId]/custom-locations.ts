// Remembers free-text locations a user has committed that are not in the city
// dataset (e.g. "Remote", "South Africa"), so they reappear as suggestions in
// other Location cells. Scoped to the browser via localStorage — per user,
// persists across reloads. No coordinates are needed: employee.location is a
// plain string and the picker only ever saves the label.

const STORAGE_KEY = 'vpc:customLocations';
const MAX_STORED = 200;
const MIN_QUERY = 2;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Persist a committed free-text location. No-op for blanks or duplicates. */
export function addCustomLocation(label: string): void {
  const value = label.trim();
  if (!value) return;
  try {
    const current = read();
    if (current.some((x) => x.toLowerCase() === value.toLowerCase())) return;
    // Most-recent first, capped so the store cannot grow unbounded.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([value, ...current].slice(0, MAX_STORED)));
  } catch {
    // localStorage unavailable (private mode / quota) — degrade silently.
  }
}

/** Case-insensitive substring match over stored custom locations. */
export function searchCustomLocations(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_QUERY) return [];
  return read().filter((x) => x.toLowerCase().includes(q));
}
