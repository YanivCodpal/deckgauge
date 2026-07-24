import type { PrismaClient, UserRoadmapPref } from '@deckgauge/db';
import {
  UpdateRoadmapPrefInputSchema,
  type UpdateRoadmapPrefInput,
} from '@deckgauge/shared';

export class RoadmapPrefsService {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertPref(
    userId: string,
    roadmapId: string,
    input: UpdateRoadmapPrefInput,
  ): Promise<UserRoadmapPref> {
    const data = UpdateRoadmapPrefInputSchema.parse(input);
    const patch = {
      ...(data.folderId !== undefined && { folderId: data.folderId }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
      ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
    };
    return this.prisma.userRoadmapPref.upsert({
      where: { userId_roadmapId: { userId, roadmapId } },
      create: { userId, roadmapId, ...patch },
      update: patch,
    });
  }

  async getPrefsForUser(userId: string, roadmapIds: string[]): Promise<UserRoadmapPref[]> {
    return this.prisma.userRoadmapPref.findMany({
      where: { userId, roadmapId: { in: roadmapIds } },
    });
  }
}
