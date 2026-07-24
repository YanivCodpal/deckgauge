import type { BoardColumn, RoadmapConfigPayload, UpdateRoadmapConfigInput } from '@deckgauge/shared';
import { setRoadmapSchedule, updateRoadmapConfig } from '../../actions/roadmap';
import { reorderItems, updateProject, updateFieldValue } from '../../actions/projects';

export interface RoadmapPersistenceAdapter {
  saveSchedule(
    itemId: string,
    patch: { startDate?: string | null; endDate?: string | null; durationCode?: string | null },
  ): Promise<{ ok: boolean }>;
  reorderItem(itemId: string, patch: { groupId?: string; order?: number }): Promise<void>;
  updateField(itemId: string, field: string, value: string): Promise<void>;
  saveConfig(patch: UpdateRoadmapConfigInput): Promise<RoadmapConfigPayload>;
  columnsFor(itemId: string): BoardColumn[];
  boardIdFor(itemId: string): string;
}

const BUILT_IN = new Set(['name', 'description', 'status', 'owner', 'assignee']);

/** Apply a built-in or custom field write to one project on a known board. */
export async function applyFieldWrite(
  boardId: string,
  itemId: string,
  field: string,
  value: string,
): Promise<void> {
  if (BUILT_IN.has(field)) {
    await updateProject(itemId, { [field]: value }, boardId);
  } else {
    await updateFieldValue(itemId, field, value, boardId);
  }
}

export function createBoardAdapter(args: {
  boardId: string;
  viewId: string;
  columns: BoardColumn[];
}): RoadmapPersistenceAdapter {
  const { boardId, viewId, columns } = args;
  return {
    saveSchedule: (itemId, patch) => setRoadmapSchedule(boardId, itemId, patch),
    reorderItem: (itemId, patch) => reorderItems([{ id: itemId, ...patch }], boardId),
    updateField: (itemId, field, value) => applyFieldWrite(boardId, itemId, field, value),
    saveConfig: (patch) => updateRoadmapConfig(boardId, viewId, patch),
    columnsFor: () => columns,
    boardIdFor: () => boardId,
  };
}
