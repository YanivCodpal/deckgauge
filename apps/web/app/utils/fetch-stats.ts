/**
 * Dev-mode fetch counter for verifying granular revalidation. Each fetch with
 * a tag set is bucketed by tag; untagged fetches go to `_untagged`. Reset
 * between scenarios to validate that editing board A does not refetch board B.
 *
 * No-op in production (NODE_ENV !== "development" and !== "test").
 */

let stats: Record<string, number> = {};

export function recordFetch(tags?: string[]): void {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") return;
  if (!tags || tags.length === 0) {
    stats["_untagged"] = (stats["_untagged"] ?? 0) + 1;
    return;
  }
  for (const tag of tags) {
    stats[tag] = (stats[tag] ?? 0) + 1;
  }
}

export function getFetchStats(): Record<string, number> {
  return { ...stats };
}

export function resetFetchStats(): void {
  stats = {};
}
