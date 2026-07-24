import type { Group } from '@deckgauge/shared';

// A raw project from the API carries fieldValues as an array of
// { columnId, value }; the board UI wants them as a columnId→value map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawProject = Record<string, any> & { id: string; groupId?: string | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BoardProject = Record<string, any> & {
  id: string;
  groupId?: string | null;
  fieldValues: Record<string, string>;
};

type GroupWithProjects<G> = G & { projects: BoardProject[] };

// Convert a project's `fieldValues` array (or absent) into a columnId→value map.
// Pure: returns a new object.
export function mapProjectFieldValues(project: RawProject): BoardProject {
  const fvMap: Record<string, string> = {};
  if (Array.isArray(project.fieldValues)) {
    for (const fv of project.fieldValues) {
      fvMap[fv.columnId] = fv.value;
    }
  }
  return { ...project, fieldValues: fvMap };
}

// Bucket a flat, API-ordered project list into its groups. Mirrors the board's
// original server-side bucketing. Pure: returns new group objects.
export function bucketProjectsIntoGroups<G extends Group>(
  groups: (G & { projects?: BoardProject[] })[],
  projects: RawProject[],
): GroupWithProjects<G>[] {
  const mapped = projects.map(mapProjectFieldValues);
  return groups.map((g) => ({
    ...g,
    projects: mapped
      .filter((p) => p.groupId === g.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }));
}

// Merge newly-loaded projects into their groups. Dedups by id so an overlap
// between the SSR first page and a client-loaded page can't double-insert, then
// re-sorts each affected group by `(order ?? 0)` — matching the board's original
// full-set sort, where a null `order` (bulk-synced rows) is treated as 0. (The
// API returns null orders NULLS LAST, so a plain append would diverge for groups
// that mix null and explicit orders.) Sort is stable, so equal orders keep their
// arrival (API createdAt) order.
export function mergeProjectsIntoGroups<G extends Group>(
  groups: GroupWithProjects<G>[],
  newProjects: RawProject[],
): GroupWithProjects<G>[] {
  if (newProjects.length === 0) return groups;
  const byGroup = new Map<string, BoardProject[]>();
  for (const raw of newProjects) {
    const p = mapProjectFieldValues(raw);
    const key = p.groupId ?? '';
    const arr = byGroup.get(key) ?? [];
    arr.push(p);
    byGroup.set(key, arr);
  }
  return groups.map((g) => {
    const additions = byGroup.get(g.id);
    if (!additions || additions.length === 0) return g;
    // Dedup against the group's existing rows AND against the batch itself: the
    // progressive loader concatenates every page, and if the API's pagination is
    // unstable the same row can land on two pages, so `additions` may contain a
    // duplicate id that isn't yet in the group. Tracking seen ids as we filter
    // keeps the first occurrence and drops the rest.
    const seenIds = new Set(g.projects.map((p) => p.id));
    const fresh = additions.filter((p) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
    if (fresh.length === 0) return g;
    const combined = [...g.projects, ...fresh].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    return { ...g, projects: combined };
  });
}
