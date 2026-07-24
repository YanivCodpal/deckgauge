'use client';

import { useDraggable } from '@dnd-kit/core';
import type { BoardNodeData } from '@deckgauge/shared';
import { BoardNode } from './BoardNode';
import type { FolderHandlers } from './FolderNode';

/**
 * A board row wrapped in a dnd-kit draggable. Used at the top level AND for
 * boards nested inside a folder, so any board can be dragged into a folder or
 * back out to the top level (drop targets are resolved by id, not position).
 */
export function DraggableBoard({
  board,
  handlers,
  depth = 0,
}: {
  board: BoardNodeData;
  handlers: FolderHandlers;
  depth?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `board:${board.id}` });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : ''}>
      <BoardNode
        board={board}
        depth={depth}
        active={board.id === handlers.activeBoardId}
        onOpen={handlers.onOpenBoard}
        onToggleFavorite={handlers.onToggleFavorite}
        onHide={handlers.onHideBoard}
        onUnhide={handlers.onUnhideBoard}
      />
    </div>
  );
}
