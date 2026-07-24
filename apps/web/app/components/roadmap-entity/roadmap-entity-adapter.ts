import type { BoardColumn, UpdateRoadmapConfigInput, RoadmapConfigPayload } from '@deckgauge/shared';
import {
  setRoadmapItemSchedule,
  updateRoadmapItemField,
  moveRoadmapItem,
  updateRoadmapGanttConfig,
} from '../../actions/roadmap';
import { type RoadmapPersistenceAdapter } from '../roadmap/roadmap-adapter';

export function createRoadmapAdapter(args: {
  roadmapId: string;
  boardByItem: Map<string, string>;
  columnsByBoard: Map<string, BoardColumn[]>;
}): RoadmapPersistenceAdapter {
  const { roadmapId, boardByItem, columnsByBoard } = args;

  const boardOf = (itemId: string): string => {
    const b = boardByItem.get(itemId);
    if (!b) throw new Error(`Unknown board for roadmap item ${itemId}`);
    return b;
  };

  return {
    saveSchedule: async (itemId, patch) => {
      boardOf(itemId);
      return setRoadmapItemSchedule(roadmapId, itemId, patch);
    },
    reorderItem: async (itemId, patch) => {
      boardOf(itemId);
      return moveRoadmapItem(roadmapId, itemId, patch);
    },
    updateField: async (itemId, field, value) => {
      boardOf(itemId);
      return updateRoadmapItemField(roadmapId, itemId, field, value);
    },
    saveConfig: (patch: UpdateRoadmapConfigInput): Promise<RoadmapConfigPayload> =>
      updateRoadmapGanttConfig(roadmapId, patch),
    columnsFor: (itemId) => columnsByBoard.get(boardByItem.get(itemId) ?? '') ?? [],
    boardIdFor: (itemId) => boardByItem.get(itemId) ?? '',
  };
}
