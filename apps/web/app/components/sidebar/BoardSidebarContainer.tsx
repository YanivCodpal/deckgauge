import { buildBoardTree, type BoardSummary } from '@deckgauge/shared';
import type { OrgTreeDto } from '@deckgauge/shared';
import { auth } from '@/auth';
import { authFetch } from '../../actions/api';
import { fetchBoardTree } from '../../actions/board-tree';
import { listOrgTrees } from '../../actions/org-trees';
import { listComparisons, type ComparisonSummary } from '../../actions/comparison';
import { boardsListTag } from '../../utils/cache-tags';
import { BoardSidebar } from './BoardSidebar';

async function fetchBoards(): Promise<BoardSummary[]> {
  try {
    const res = await authFetch('/boards', { tags: [boardsListTag()] });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    const boards = Array.isArray(data) ? (data as Array<{ id: string; name: string }>) : [];
    return boards.map((b) => ({ id: b.id, name: b.name }));
  } catch {
    return [];
  }
}

export async function BoardSidebarContainer({
  activeBoardId,
}: {
  activeBoardId: string | null;
}) {
  const session = await auth();
  if (!session) return null; // hidden when unauthenticated (login page)

  const [{ folders, prefs, roadmaps, roadmapPrefs }, boards, orgTrees, comparisons] =
    await Promise.all([
      fetchBoardTree(),
      fetchBoards(),
      listOrgTrees() as Promise<OrgTreeDto[]>,
      listComparisons() as Promise<ComparisonSummary[]>,
    ]);
  const tree = buildBoardTree(folders, prefs, boards, roadmaps, roadmapPrefs);

  return (
    <BoardSidebar
      tree={tree}
      activeBoardId={activeBoardId}
      orgTrees={orgTrees}
      comparisons={comparisons}
    />
  );
}
