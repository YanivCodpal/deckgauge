'use client';

import { useDroppable } from '@dnd-kit/core';
import type { FolderNodeData, BoardNodeData, RoadmapNodeData, SidebarNode } from '@deckgauge/shared';
import { DraggableBoard } from './DraggableBoard';
import { DraggableRoadmap } from './DraggableRoadmap';
import { RowMenu, type RowMenuItem } from './RowMenu';

export interface FolderHandlers {
  activeBoardId: string | null;
  onOpenBoard: (id: string) => void;
  onToggleExpand: (folder: FolderNodeData) => void;
  onRenameFolder: (folder: FolderNodeData) => void;
  onRecolorFolder: (folder: FolderNodeData) => void;
  onDeleteFolder: (folder: FolderNodeData) => void;
  onToggleFavorite: (board: BoardNodeData) => void;
  onHideBoard: (board: BoardNodeData) => void;
  onUnhideBoard: (board: BoardNodeData) => void;
  onMoveRoadmap: (roadmapId: string, folderId: string | null) => void;
  onToggleRoadmapFavorite: (node: RoadmapNodeData) => void;
  onHideRoadmap: (node: RoadmapNodeData) => void;
  onUnhideRoadmap: (node: RoadmapNodeData) => void;
  onDeleteRoadmap: (node: RoadmapNodeData) => void;
}

export function FolderNode({
  folder, depth, handlers,
}: {
  folder: FolderNodeData;
  depth: number;
  handlers: FolderHandlers;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` });

  const menuItems: RowMenuItem[] = [
    { label: 'Rename', onSelect: () => handlers.onRenameFolder(folder) },
    { label: 'Change color', onSelect: () => handlers.onRecolorFolder(folder) },
    { label: 'Delete folder', danger: true, onSelect: () => handlers.onDeleteFolder(folder) },
  ];

  return (
    <div>
      <div
        ref={setNodeRef}
        className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm ${
          isOver ? 'ring-2 ring-indigo-300' : ''
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          type="button"
          onClick={() => handlers.onToggleExpand(folder)}
          aria-expanded={folder.isExpanded}
          aria-label={`${folder.isExpanded ? 'Collapse' : 'Expand'} ${folder.name}`}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="w-2 text-[9px] text-slate-400">{folder.isExpanded ? '▼' : '▶'}</span>
          <span aria-hidden style={{ color: folder.color }}>📁</span>
          <span className="truncate">{folder.name}</span>
        </button>
        <RowMenu items={menuItems} label={`Actions for ${folder.name}`} />
      </div>

      {folder.isExpanded &&
        folder.children.map((child: SidebarNode) =>
          child.kind === 'folder' ? (
            <FolderNode key={child.id} folder={child} depth={depth + 1} handlers={handlers} />
          ) : child.kind === 'roadmap' ? (
            <DraggableRoadmap
              key={child.id}
              node={child as RoadmapNodeData}
              depth={depth + 1}
              active={child.id === handlers.activeBoardId}
              onToggleFavorite={handlers.onToggleRoadmapFavorite}
              onHide={handlers.onHideRoadmap}
              onUnhide={handlers.onUnhideRoadmap}
              onDelete={handlers.onDeleteRoadmap}
            />
          ) : (
            <DraggableBoard
              key={child.id}
              board={child as BoardNodeData}
              handlers={handlers}
              depth={depth + 1}
            />
          ),
        )}
    </div>
  );
}
