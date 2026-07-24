import type { SidebarNode, RoadmapNodeData, BoardNodeData } from '@deckgauge/shared';

/**
 * The assembled `BoardTree` interleaves boards and roadmaps — both at the top
 * level and inside folders. The rail shows them as two separate types, so these
 * helpers split one tree into a board-only tree and a flat roadmap list.
 */

/**
 * Board-only view: keeps every folder (folders are a board-organising concept,
 * so a freshly created empty one must not vanish) but strips roadmap nodes out
 * of the top level and out of every folder's children, recursively.
 */
export function boardsOnlyTree(nodes: SidebarNode[]): SidebarNode[] {
  const out: SidebarNode[] = [];
  for (const n of nodes) {
    if (n.kind === 'roadmap') continue;
    if (n.kind === 'folder') {
      out.push({ ...n, children: boardsOnlyTree(n.children) });
    } else {
      out.push(n);
    }
  }
  return out;
}

/**
 * Roadmap view: flattens every roadmap out of the tree (folders included) into
 * a single position-ordered list. Roadmaps get their own type panel rather than
 * folder nesting, matching the redesign.
 */
export function collectRoadmaps(nodes: SidebarNode[]): RoadmapNodeData[] {
  const out: RoadmapNodeData[] = [];
  const walk = (list: SidebarNode[]): void => {
    for (const n of list) {
      if (n.kind === 'roadmap') out.push(n);
      else if (n.kind === 'folder') walk(n.children);
    }
  };
  walk(nodes);
  return out.sort((a, b) => a.position - b.position);
}

/** Case-insensitive name match, shared by every panel's search box. */
export function matchesQuery(name: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || name.toLowerCase().includes(needle);
}

/** Narrowing helpers for the mixed favorites / hidden arrays. */
export function isBoardNode(n: BoardNodeData | RoadmapNodeData): n is BoardNodeData {
  return n.kind === 'board';
}
export function isRoadmapNode(n: BoardNodeData | RoadmapNodeData): n is RoadmapNodeData {
  return n.kind === 'roadmap';
}
