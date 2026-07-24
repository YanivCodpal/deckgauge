/**
 * Pure function that decides what kind of drop occurred.
 *
 * Extracted so it can be unit-tested without a jsdom DnD simulation.
 */

export type DropActionType = 'same-board' | 'cross-board' | 'no-op';

export interface ResolvedDropAction {
  type: DropActionType;
  /** The project id being moved */
  projectId: string;
  /** Source group id */
  sourceGroupId: string;
  /** Source board id */
  sourceBoardId: string;
  /** Target group id */
  targetGroupId: string;
  /** Target board id */
  targetBoardId: string;
}

export interface DropDraggedItem {
  projectId: string;
  groupId: string;
  boardId: string;
}

export interface DropTargetGroup {
  groupId: string;
  boardId: string;
}

/**
 * Resolves the action type for a completed drag.
 *
 * Returns `{ type: 'no-op' }` when the item is dropped onto its own group.
 * Returns `{ type: 'same-board' }` for a move within the same board.
 * Returns `{ type: 'cross-board' }` for a move to a different board.
 */
export function resolveDropAction(
  draggedItem: DropDraggedItem,
  targetGroup: DropTargetGroup,
): ResolvedDropAction {
  const { projectId, groupId: sourceGroupId, boardId: sourceBoardId } = draggedItem;
  const { groupId: targetGroupId, boardId: targetBoardId } = targetGroup;

  if (sourceGroupId === targetGroupId) {
    return {
      type: 'no-op',
      projectId,
      sourceGroupId,
      sourceBoardId,
      targetGroupId,
      targetBoardId,
    };
  }

  const type: DropActionType =
    sourceBoardId === targetBoardId ? 'same-board' : 'cross-board';

  return {
    type,
    projectId,
    sourceGroupId,
    sourceBoardId,
    targetGroupId,
    targetBoardId,
  };
}
