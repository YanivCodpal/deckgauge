'use client';

import { useDraggable } from '@dnd-kit/core';
import type { RoadmapNodeData } from '@deckgauge/shared';
import { RoadmapNode } from './RoadmapNode';

/**
 * A roadmap row wrapped in a dnd-kit draggable, mirroring DraggableBoard. Lets a
 * roadmap be dragged into a folder or back out to the top level; the move is
 * persisted via roadmap prefs (see SidebarTree.onDragEnd -> onMoveRoadmap). The
 * `roadmap:` id prefix distinguishes it from `board:` draggables. The row-menu
 * handlers (favorite/hide/delete) are forwarded to RoadmapNode so a filed or
 * top-level roadmap keeps its actions menu.
 */
export function DraggableRoadmap({
  node,
  depth = 0,
  active = false,
  onToggleFavorite,
  onHide,
  onUnhide,
  onDelete,
}: {
  node: RoadmapNodeData;
  depth?: number;
  active?: boolean;
  onToggleFavorite?: (node: RoadmapNodeData) => void;
  onHide?: (node: RoadmapNodeData) => void;
  onUnhide?: (node: RoadmapNodeData) => void;
  onDelete?: (node: RoadmapNodeData) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `roadmap:${node.id}` });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : ''}>
      <RoadmapNode
        node={node}
        depth={depth}
        active={active}
        onToggleFavorite={onToggleFavorite}
        onHide={onHide}
        onUnhide={onUnhide}
        onDelete={onDelete}
      />
    </div>
  );
}
