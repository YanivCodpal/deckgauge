import type { PrismaClient, Prisma } from '@deckgauge/db';
import {
  DEFAULT_SIZE_DURATIONS,
  DEFAULT_SIZE_WEEKS,
  type RoadmapConfigPayload,
  type UpdateRoadmapConfigInput,
  type SizeDurations,
} from '@deckgauge/shared';

interface ConfigRow {
  id: string;
  boardViewId: string;
  startDate: Date;
  visibleQuarters: number;
  sizeDurations: unknown;
  defaultSizeWeeks: number;
  hiddenGroupIds: unknown;
}

export function toConfigPayload(row: ConfigRow): RoadmapConfigPayload {
  return {
    id: row.id,
    boardViewId: row.boardViewId,
    startDate: row.startDate.toISOString(),
    visibleQuarters: row.visibleQuarters,
    sizeDurations: row.sizeDurations as SizeDurations,
    defaultSizeWeeks: row.defaultSizeWeeks,
    hiddenGroupIds: (row.hiddenGroupIds as string[] | undefined) ?? [],
  };
}

export class RoadmapConfigService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrCreate(boardViewId: string): Promise<RoadmapConfigPayload> {
    const view = await this.prisma.boardView.findUnique({ where: { id: boardViewId } });
    if (!view) throw new Error('VIEW_NOT_FOUND');

    const existing = await this.prisma.roadmapConfig.findUnique({ where: { boardViewId } });
    if (existing) return toConfigPayload(existing as unknown as ConfigRow);

    const created = await this.prisma.roadmapConfig.create({
      data: {
        boardViewId,
        startDate: new Date(),
        visibleQuarters: 4,
        sizeDurations: DEFAULT_SIZE_DURATIONS as unknown as Prisma.InputJsonValue,
        defaultSizeWeeks: DEFAULT_SIZE_WEEKS,
        hiddenGroupIds: [],
      },
    });
    return toConfigPayload(created as unknown as ConfigRow);
  }

  async update(
    boardViewId: string,
    input: UpdateRoadmapConfigInput,
  ): Promise<RoadmapConfigPayload> {
    await this.getOrCreate(boardViewId);
    const data: Prisma.RoadmapConfigUpdateInput = {};
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
    if (input.visibleQuarters !== undefined) data.visibleQuarters = input.visibleQuarters;
    if (input.defaultSizeWeeks !== undefined) data.defaultSizeWeeks = input.defaultSizeWeeks;
    if (input.sizeDurations !== undefined)
      data.sizeDurations = input.sizeDurations as unknown as Prisma.InputJsonValue;
    if (input.hiddenGroupIds !== undefined)
      data.hiddenGroupIds = input.hiddenGroupIds as unknown as Prisma.InputJsonValue;
    const updated = await this.prisma.roadmapConfig.update({ where: { boardViewId }, data });
    return toConfigPayload(updated as unknown as ConfigRow);
  }
}
