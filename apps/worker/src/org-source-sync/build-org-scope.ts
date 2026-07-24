import type { GraphUser, ScopeNode } from '@deckgauge/shared';

export async function buildOrgScope(
  root: GraphUser,
  fetchReports: (graphId: string) => Promise<GraphUser[]>,
): Promise<ScopeNode[]> {
  const result: ScopeNode[] = [{ user: root, managerGraphId: null, position: 0 }];
  const visited = new Set<string>([root.id]);
  const queue: GraphUser[] = [root];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    const reports = await fetchReports(parent.id);
    let position = 0;
    for (const child of reports) {
      // Skip departed staff: Azure keeps the manager→directReports edge after
      // someone leaves, but disables their account first. Excluding them here
      // also drops their subtree, since we never queue them for expansion.
      if (child.accountEnabled === false) continue;
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push({ user: child, managerGraphId: parent.id, position });
      position += 1;
      queue.push(child);
    }
  }
  return result;
}
