'use client';

/**
 * V1 drag scope: move a board OR roadmap into a folder (droppable) or back out
 * to the top level — both are draggable wherever they live, including nested
 * inside a folder. Reordering within a level and dragging folders are NOT
 * supported by drag yet; the row-menu actions are the non-drag fallback.
 */
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { SidebarNode, FolderNodeData, BoardNodeData, RoadmapNodeData } from '@deckgauge/shared';
import { FolderNode, type FolderHandlers } from './FolderNode';
import { DraggableBoard } from './DraggableBoard';
import { DraggableRoadmap } from './DraggableRoadmap';
import { findBoardById, findRoadmapById, preferFolderCollision, resolveDropTarget } from './sidebar-dnd';

interface SidebarTreeProps {
  nodes: SidebarNode[];
  handlers: FolderHandlers & {
    onMoveBoard: (boardId: string, folderId: string | null) => void;
    onMoveRoadmap: (roadmapId: string, folderId: string | null) => void;
    onToggleRoadmapFavorite: (node: RoadmapNodeData) => void;
    onHideRoadmap: (node: RoadmapNodeData) => void;
    onUnhideRoadmap: (node: RoadmapNodeData) => void;
    onDeleteRoadmap: (node: RoadmapNodeData) => void;
  };
}

// Prefer a folder when the pointer is within both it and the full-width root
// droppable; fall back to rect intersection when the pointer is outside the list.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return preferFolderCollision(pointerHits);
  return rectIntersection(args);
};

export function SidebarTree({ nodes, handlers }: SidebarTreeProps) {
  const topLevel = useDroppable({ id: 'folder:root' });
  const [dragging, setDragging] = useState<{ name: string; kind: 'board' | 'roadmap' } | null>(null);

  // Require a small drag distance before activating, otherwise the pointer
  // sensor swallows the synthetic click and rows never open on click.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('board:')) {
      const board = findBoardById(nodes, id.slice('board:'.length));
      if (board) setDragging({ name: board.name, kind: 'board' });
    } else if (id.startsWith('roadmap:')) {
      const roadmap = findRoadmapById(nodes, id.slice('roadmap:'.length));
      if (roadmap) setDragging({ name: roadmap.name, kind: 'roadmap' });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const move = resolveDropTarget(String(e.active.id), e.over ? String(e.over.id) : null);
    if (!move) return;
    if (move.kind === 'board') handlers.onMoveBoard(move.id, move.folderId);
    else handlers.onMoveRoadmap(move.id, move.folderId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div ref={topLevel.setNodeRef} className="space-y-0.5">
        {nodes.map((node) =>
          node.kind === 'folder' ? (
            <FolderNode key={node.id} folder={node as FolderNodeData} depth={0} handlers={handlers} />
          ) : node.kind === 'roadmap' ? (
            <DraggableRoadmap
              key={node.id}
              node={node as RoadmapNodeData}
              depth={0}
              active={node.id === handlers.activeBoardId}
              onToggleFavorite={handlers.onToggleRoadmapFavorite}
              onHide={handlers.onHideRoadmap}
              onUnhide={handlers.onUnhideRoadmap}
              onDelete={handlers.onDeleteRoadmap}
            />
          ) : (
            <DraggableBoard key={node.id} board={node as BoardNodeData} handlers={handlers} />
          ),
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-lg">
            {dragging.kind === 'roadmap' ? (
              <span aria-hidden className="text-base leading-none text-violet-400">🗺</span>
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-sm bg-slate-400" />
            )}
            <span className="truncate">{dragging.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
