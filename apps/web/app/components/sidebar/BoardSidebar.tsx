'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  BoardTree,
  BoardNodeData,
  FolderNodeData,
  SidebarNode,
  OrgTreeDto,
  RoadmapNodeData,
} from '@deckgauge/shared';
import { setLastBoardCookie } from '../../utils/last-board-cookie';
import { useSidebarUiState, type SidebarType } from '../../hooks/useSidebarUiState';
import { SidebarSearch } from './SidebarSearch';
import { SidebarRail } from './SidebarRail';
import { SidebarPanelHeader } from './SidebarPanelHeader';
import { SidebarNewMenu, type NewMenuItem } from './SidebarNewMenu';
import { BoardsPanel } from './panels/BoardsPanel';
import { RoadmapsPanel } from './panels/RoadmapsPanel';
import { TimesheetsPanel } from './panels/TimesheetsPanel';
import { OrgTreesPanel } from './panels/OrgTreesPanel';
import { ComparisonsPanel } from './panels/ComparisonsPanel';
import { FavoritesPanel } from './panels/FavoritesPanel';
import { boardsOnlyTree, collectRoadmaps, isBoardNode, isRoadmapNode, matchesQuery } from './tree-filter';
import { updateBoardPref, updateFolder, deleteFolder, createFolder, createBoard } from '../../actions/board-tree';
import { createOrgTree } from '../../actions/org-trees';
import { createComparison, type ComparisonSummary } from '../../actions/comparison';
import { BOARD_TEMPLATES, type BoardKind } from '@deckgauge/shared';
import { createRoadmap, updateRoadmapPref, deleteRoadmap } from '../../actions/roadmap';
import type { FolderHandlers } from './FolderNode';

/** Recursive name-filter over the board tree, keeping folders that still match. */
function filterNodes(nodes: SidebarNode[], q: string): SidebarNode[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return nodes;
  const walk = (list: SidebarNode[]): SidebarNode[] => {
    const out: SidebarNode[] = [];
    for (const n of list) {
      if (n.kind === 'board' || n.kind === 'roadmap') {
        if (n.name.toLowerCase().includes(needle)) out.push(n);
      } else {
        const kids = walk(n.children);
        if (n.name.toLowerCase().includes(needle) || kids.length > 0) {
          out.push({ ...n, isExpanded: true, children: kids });
        }
      }
    }
    return out;
  };
  return walk(nodes);
}

function countBoards(nodes: SidebarNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.kind === 'board') n += 1;
    else if (node.kind === 'folder') n += countBoards(node.children);
  }
  return n;
}

const PLACEHOLDERS: Record<SidebarType, string> = {
  favorites: 'Search favorites…',
  boards: 'Search boards…',
  roadmaps: 'Search roadmaps…',
  timesheets: 'Search timesheets…',
  orgTrees: 'Search org trees…',
  comparisons: 'Search comparisons…',
};

const TITLES: Record<SidebarType, string> = {
  favorites: 'Favorites',
  boards: 'Boards',
  roadmaps: 'Roadmaps',
  timesheets: 'Timesheets',
  orgTrees: 'Org Trees',
  comparisons: 'Comparisons',
};

// Small inline icons for the New menu (15px, currentColor).
const MENU_ICONS = {
  board: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
  roadmap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-[15px] w-[15px]">
      <path d="M4 6h11M4 12h16M4 18h8" />
    </svg>
  ),
  orgTree: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
      <rect x="9" y="2.5" width="6" height="5" rx="1.4" />
      <rect x="2.5" y="16.5" width="6" height="5" rx="1.4" />
      <rect x="15.5" y="16.5" width="6" height="5" rx="1.4" />
      <path d="M12 7.5V12m0 0H5.5v4.5M12 12h6.5v4.5" />
    </svg>
  ),
  comparison: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
      <path d="M6 4v6a3 3 0 0 0 3 3h9" />
      <path d="M15 10l3 3-3 3" />
    </svg>
  ),
};

type TreeHandlers = FolderHandlers & {
  onMoveBoard: (boardId: string, folderId: string | null) => void;
  onMoveRoadmap: (roadmapId: string, folderId: string | null) => void;
  onToggleRoadmapFavorite: (node: RoadmapNodeData) => void;
  onHideRoadmap: (node: RoadmapNodeData) => void;
  onUnhideRoadmap: (node: RoadmapNodeData) => void;
  onDeleteRoadmap: (node: RoadmapNodeData) => void;
};

export function BoardSidebar({
  tree,
  activeBoardId,
  orgTrees = [],
  comparisons = [],
}: {
  tree: BoardTree;
  activeBoardId: string | null;
  orgTrees?: OrgTreeDto[];
  comparisons?: ComparisonSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { collapsed, toggleCollapsed, activeType, setActiveType, isSectionOpen, toggleSection } =
    useSidebarUiState();
  const [query, setQuery] = useState('');

  // Roadmaps render at /roadmap/<id>. Mirror page.tsx's resolution so the
  // highlighted node always matches what's on screen.
  const activeRoadmapId = pathname?.match(/^\/roadmap\/([^/]+)/)?.[1] ?? null;
  const effectiveActiveId = activeRoadmapId ?? searchParams.get('boardId') ?? activeBoardId;
  const activeOrgTreeId = pathname === '/timesheet' ? searchParams.get('orgTreeId') : null;

  const openBoard = useCallback(
    (id: string) => {
      setLastBoardCookie(id);
      router.push(`/?boardId=${id}`);
    },
    [router],
  );

  const after = useCallback(() => router.refresh(), [router]);

  const onToggleRoadmapFavorite = useCallback(
    async (n: RoadmapNodeData) => {
      await updateRoadmapPref(n.id, { isFavorite: !n.isFavorite });
      after();
    },
    [after],
  );
  const onHideRoadmap = useCallback(
    async (n: RoadmapNodeData) => {
      await updateRoadmapPref(n.id, { isHidden: true });
      after();
    },
    [after],
  );
  const onUnhideRoadmap = useCallback(
    async (n: RoadmapNodeData) => {
      await updateRoadmapPref(n.id, { isHidden: false });
      after();
    },
    [after],
  );
  const onDeleteRoadmap = useCallback(
    async (n: RoadmapNodeData) => {
      if (window.confirm(`Delete roadmap "${n.name}"? This cannot be undone.`)) {
        await deleteRoadmap(n.id);
        if (activeRoadmapId === n.id) router.push('/');
        else after();
      }
    },
    [after, activeRoadmapId, router],
  );

  const handlers: TreeHandlers = useMemo(
    () => ({
      activeBoardId: effectiveActiveId,
      onOpenBoard: openBoard,
      onToggleExpand: async (f: FolderNodeData) => {
        await updateFolder(f.id, { isExpanded: !f.isExpanded });
        after();
      },
      onRenameFolder: async (f: FolderNodeData) => {
        const name = window.prompt('Rename folder', f.name);
        if (name && name.trim()) {
          await updateFolder(f.id, { name: name.trim() });
          after();
        }
      },
      onRecolorFolder: async (f: FolderNodeData) => {
        const color = window.prompt('Folder color hex (e.g. #10B981)', f.color);
        if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
          await updateFolder(f.id, { color });
          after();
        }
      },
      onDeleteFolder: async (f: FolderNodeData) => {
        if (window.confirm(`Delete folder "${f.name}"? Boards inside it move to the top level.`)) {
          await deleteFolder(f.id);
          after();
        }
      },
      onToggleFavorite: async (b: BoardNodeData) => {
        await updateBoardPref(b.id, { isFavorite: !b.isFavorite });
        after();
      },
      onHideBoard: async (b: BoardNodeData) => {
        await updateBoardPref(b.id, { isHidden: true });
        after();
      },
      onUnhideBoard: async (b: BoardNodeData) => {
        await updateBoardPref(b.id, { isHidden: false });
        after();
      },
      onMoveBoard: async (boardId: string, folderId: string | null) => {
        await updateBoardPref(boardId, { folderId });
        after();
      },
      onMoveRoadmap: async (roadmapId: string, folderId: string | null) => {
        await updateRoadmapPref(roadmapId, { folderId });
        after();
      },
      onToggleRoadmapFavorite,
      onHideRoadmap,
      onUnhideRoadmap,
      onDeleteRoadmap,
    }),
    [effectiveActiveId, openBoard, after, onToggleRoadmapFavorite, onHideRoadmap, onUnhideRoadmap, onDeleteRoadmap],
  );

  // ---- Per-type derived data ----
  const boardTree = useMemo(() => boardsOnlyTree(tree.tree), [tree.tree]);
  const visibleBoardTree = useMemo(() => filterNodes(boardTree, query), [boardTree, query]);
  const boardFavorites = useMemo(
    () => tree.favorites.filter(isBoardNode).filter((b) => matchesQuery(b.name, query)),
    [tree.favorites, query],
  );
  const boardHidden = useMemo(() => tree.hidden.filter(isBoardNode), [tree.hidden]);

  const allRoadmaps = useMemo(
    () => collectRoadmaps(tree.tree).filter((r) => matchesQuery(r.name, query)),
    [tree.tree, query],
  );
  const hiddenRoadmaps = useMemo(() => tree.hidden.filter(isRoadmapNode), [tree.hidden]);

  const favoriteItems = useMemo(
    () => tree.favorites.filter((n) => matchesQuery(n.name, query)),
    [tree.favorites, query],
  );

  const visibleOrgTrees = useMemo(
    () => orgTrees.filter((ot) => matchesQuery(ot.name, query)),
    [orgTrees, query],
  );

  const visibleComparisons = useMemo(
    () => comparisons.filter((c) => matchesQuery(c.name, query)),
    [comparisons, query],
  );

  const counts: Record<SidebarType, number | undefined> = {
    favorites: tree.favorites.length,
    boards: countBoards(boardTree),
    roadmaps: collectRoadmaps(tree.tree).length,
    timesheets: orgTrees.length,
    orgTrees: orgTrees.length,
    comparisons: comparisons.length,
  };

  // ---- New menu ----
  const handleNewBoard = useCallback(
    async (template: BoardKind) => {
      const name = window.prompt('New board name');
      if (name && name.trim()) {
        const board = await createBoard(name.trim(), template);
        openBoard(board.id);
      }
    },
    [openBoard],
  );
  const handleNewFolder = useCallback(async () => {
    const name = window.prompt('New folder name');
    if (name && name.trim()) {
      await createFolder({ name: name.trim(), color: '#6366F1' });
      after();
    }
  }, [after]);
  const handleNewRoadmap = useCallback(async () => {
    const name = window.prompt('New roadmap name');
    if (name && name.trim()) {
      const roadmap = await createRoadmap(name.trim());
      router.push(`/roadmap/${roadmap.id}`);
    }
  }, [router]);
  const handleNewOrgTree = useCallback(async () => {
    const name = window.prompt('New org tree name');
    if (name && name.trim()) {
      const created = await createOrgTree(name.trim());
      router.push(`/org/${created.id}`);
    }
  }, [router]);
  const handleNewComparison = useCallback(async () => {
    const name = window.prompt('New comparison name');
    if (name && name.trim()) {
      const created = await createComparison(name.trim());
      router.push(`/comparison/${created.id}`);
    }
  }, [router]);

  // Board-type picker: one entry per template (auto-extends as templates are added),
  // then the org/employees route (a separate domain, not a board template).
  const boardTemplateItems: NewMenuItem[] = BOARD_TEMPLATES.map((t) => ({
    label: `New board · ${t.label}`,
    icon: MENU_ICONS.board,
    onSelect: () => handleNewBoard(t.kind),
  }));

  const newItems: NewMenuItem[] = [
    ...boardTemplateItems,
    { label: 'New folder', icon: MENU_ICONS.folder, onSelect: handleNewFolder },
    { label: 'New roadmap', icon: MENU_ICONS.roadmap, onSelect: handleNewRoadmap },
    { label: 'New org / employees', icon: MENU_ICONS.orgTree, onSelect: handleNewOrgTree },
    { label: 'New comparison', icon: MENU_ICONS.comparison, onSelect: handleNewComparison },
  ];

  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] shrink-0 border-r border-slate-200 bg-slate-50">
      <SidebarRail activeType={activeType} onSelect={setActiveType} />

      {!collapsed && (
        <div className="flex w-60 flex-col">
          <SidebarPanelHeader
            title={TITLES[activeType]}
            count={counts[activeType]}
            onCollapse={toggleCollapsed}
          />

          <SidebarSearch value={query} onChange={setQuery} placeholder={PLACEHOLDERS[activeType]} />

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {activeType === 'favorites' && (
              <FavoritesPanel
                favorites={favoriteItems}
                activeId={effectiveActiveId}
                openBoard={openBoard}
                onToggleBoardFavorite={handlers.onToggleFavorite}
                onHideBoard={handlers.onHideBoard}
                onUnhideBoard={handlers.onUnhideBoard}
                onToggleRoadmapFavorite={onToggleRoadmapFavorite}
                onHideRoadmap={onHideRoadmap}
                onUnhideRoadmap={onUnhideRoadmap}
                onDeleteRoadmap={onDeleteRoadmap}
              />
            )}

            {activeType === 'boards' && (
              <BoardsPanel
                favorites={boardFavorites}
                tree={visibleBoardTree}
                hidden={boardHidden}
                activeBoardId={effectiveActiveId}
                openBoard={openBoard}
                handlers={handlers}
                isSectionOpen={isSectionOpen}
                toggleSection={toggleSection}
              />
            )}

            {activeType === 'roadmaps' && (
              <RoadmapsPanel
                roadmaps={allRoadmaps}
                hidden={hiddenRoadmaps}
                activeRoadmapId={activeRoadmapId}
                onToggleFavorite={onToggleRoadmapFavorite}
                onHide={onHideRoadmap}
                onUnhide={onUnhideRoadmap}
                onDelete={onDeleteRoadmap}
              />
            )}

            {activeType === 'timesheets' && (
              <TimesheetsPanel
                orgTrees={visibleOrgTrees}
                activeOrgTreeId={activeOrgTreeId}
                onNavigate={() => setQuery('')}
              />
            )}

            {activeType === 'orgTrees' && (
              <OrgTreesPanel orgTrees={visibleOrgTrees} activePath={pathname} />
            )}

            {activeType === 'comparisons' && (
              <ComparisonsPanel comparisons={visibleComparisons} activePath={pathname} />
            )}
          </div>

          <SidebarNewMenu items={newItems} />
        </div>
      )}
    </aside>
  );
}
