import type { PrismaClient } from '@deckgauge/db';
import { reconcileRoadmapGroups } from '@deckgauge/shared';

export class RoadmapMembershipService {
  constructor(private readonly prisma: PrismaClient) {}

  async addGroups(roadmapId: string, groupIds: string[]): Promise<void> {
    const max = await this.prisma.roadmapGroup.aggregate({
      where: { roadmapId },
      _max: { position: true },
    });
    let pos = (max._max.position ?? -1) + 1;
    await this.prisma.roadmapGroup.createMany({
      data: groupIds.map((groupId) => ({ roadmapId, groupId, position: pos++, source: 'MANUAL' as const })),
      skipDuplicates: true,
    });
  }

  async removeGroup(roadmapId: string, groupId: string): Promise<void> {
    await this.prisma.roadmapGroup.deleteMany({ where: { roadmapId, groupId } });
  }

  async addSubscription(roadmapId: string, boardId: string): Promise<void> {
    await this.prisma.roadmapBoardSubscription.upsert({
      where: { roadmapId_boardId: { roadmapId, boardId } },
      create: { roadmapId, boardId },
      update: {},
    });
    await this.reconcile(roadmapId);
  }

  async removeSubscription(roadmapId: string, boardId: string): Promise<void> {
    await this.prisma.roadmapBoardSubscription.deleteMany({ where: { roadmapId, boardId } });
    await this.reconcile(roadmapId);
  }

  async reorder(roadmapId: string, orderedGroupIds: string[]): Promise<void> {
    const ops = orderedGroupIds.map((groupId, i) =>
      this.prisma.roadmapGroup.update({
        where: { roadmapId_groupId: { roadmapId, groupId } },
        data: { position: i },
      }),
    );
    await this.prisma.$transaction(ops);
  }

  async reconcile(roadmapId: string): Promise<void> {
    const [existing, subs] = await Promise.all([
      this.prisma.roadmapGroup.findMany({
        where: { roadmapId },
        select: { groupId: true, position: true, source: true },
      }),
      this.prisma.roadmapBoardSubscription.findMany({
        where: { roadmapId },
        select: { boardId: true },
      }),
    ]);
    const subscribedBoardIds = subs.map((s) => s.boardId);
    const subscribedGroups =
      subscribedBoardIds.length > 0
        ? await this.prisma.group.findMany({
            where: { boardId: { in: subscribedBoardIds } },
            orderBy: [{ boardId: 'asc' }, { position: 'asc' }],
            select: { id: true, boardId: true },
          })
        : [];

    const referencedIds = Array.from(
      new Set([...existing.map((e) => e.groupId), ...subscribedGroups.map((g) => g.id)]),
    );
    const liveRows =
      referencedIds.length > 0
        ? await this.prisma.group.findMany({
            where: { id: { in: referencedIds } },
            select: { id: true },
          })
        : [];

    const result = reconcileRoadmapGroups({
      existing: existing.map((e) => ({
        groupId: e.groupId,
        position: e.position,
        source: e.source as 'MANUAL' | 'BOARD_SUB',
      })),
      subscribedBoardIds,
      subscribedGroups: subscribedGroups.map((g) => ({ groupId: g.id, boardId: g.boardId })),
      liveGroupIds: new Set(liveRows.map((r) => r.id)),
    });

    if (result.toCreate.length > 0) {
      await this.prisma.roadmapGroup.createMany({
        data: result.toCreate.map((c) => ({ roadmapId, ...c })),
        skipDuplicates: true,
      });
    }
    if (result.toDelete.length > 0) {
      await this.prisma.roadmapGroup.deleteMany({
        where: { roadmapId, groupId: { in: result.toDelete } },
      });
    }
  }
}
