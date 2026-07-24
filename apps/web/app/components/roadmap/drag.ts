import { PX_PER_DAY } from './geometry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DragResult =
  | { kind: 'group-move'; id: string; targetGroupId: string }
  | { kind: 'reorder'; id: string; deltaY: number }
  | { kind: 'move'; id: string; deltaX: number }
  | { kind: 'none' };

export interface ClassifyDragArgs {
  activeId: string;
  activeGroupId: string | null;
  overGroupId: string | null;
  delta: { x: number; y: number };
  rowHeight: number;
}

// ---------------------------------------------------------------------------
// Pure helper — testable without DOM / pointer events
// ---------------------------------------------------------------------------

export function classifyDrag({
  activeId,
  activeGroupId,
  overGroupId,
  delta,
  rowHeight,
}: ClassifyDragArgs): DragResult {
  // 1. Cross-lane move: pointer ended over a different group lane.
  if (overGroupId !== null && overGroupId !== activeGroupId) {
    return { kind: 'group-move', id: activeId, targetGroupId: overGroupId };
  }

  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  // 2. Vertical reorder: moved at least half a row height, and vertical
  //    displacement dominates horizontal displacement.
  if (absY >= rowHeight / 2 && absY > absX) {
    return { kind: 'reorder', id: activeId, deltaY: delta.y };
  }

  // 3. Horizontal move: moved at least one "day" worth of pixels.
  if (absX >= PX_PER_DAY) {
    return { kind: 'move', id: activeId, deltaX: delta.x };
  }

  return { kind: 'none' };
}
