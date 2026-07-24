import type { PrismaClient } from '@deckgauge/db';
import {
  type CreateRoadmapInput,
  type UpdateRoadmapInput,
  type RoadmapSummary,
  type RoadmapAccessRoleValue,
  type RoadmapDetail,
  type SystemColumnKey,
  type SizeDurations,
  sizeWeeksFromLabel,
} from '@deckgauge/shared';
import { RoadmapMembershipService } from './roadmap-membership.service.js';
import { RoadmapGanttConfigService } from './roadmap-gantt-config.service.js';

export class RoadmapService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateRoadmapInput): Promise<RoadmapSummary> {
    return this.prisma.$transaction(async (tx) => {
      const roadmap = await tx.roadmap.create({
        data: { name: input.name, description: input.description ?? null, createdBy: userId },
        select: { id: true, name: true },
      });
      await tx.roadmapAccess.create({
        data: { roadmapId: roadmap.id, userId, role: 'OWNER' },
      });
      await tx.roadmapView.create({
        data: { roadmapId: roadmap.id, type: 'GRID', name: 'Grid', position: 0 },
      });
      await tx.roadmapView.create({
        data: {
          roadmapId: roadmap.id,
          type: 'GANTT',
          name: 'Timeline',
          position: 1,
          ganttConfig: {
            create: { startDate: new Date(), sizeDurations: {}, visibleQuarters: 4 },
          },
        },
      });
      return roadmap;
    });
  }

  async listForUser(userId: string): Promise<RoadmapSummary[]> {
    const rows = await this.prisma.roadmap.findMany({
      where: { accessEntries: { some: { userId } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async update(roadmapId: string, input: UpdateRoadmapInput): Promise<void> {
    await this.prisma.roadmap.update({
      where: { id: roadmapId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.hiddenSystemColumns !== undefined && {
          hiddenSystemColumns: input.hiddenSystemColumns,
        }),
      },
    });
  }

  async remove(roadmapId: string): Promise<void> {
    await this.prisma.roadmap.delete({ where: { id: roadmapId } });
  }

  async getRole(roadmapId: string, userId: string): Promise<RoadmapAccessRoleValue | null> {
    const a = await this.prisma.roadmapAccess.findUnique({
      where: { roadmapId_userId: { roadmapId, userId } },
      select: { role: true },
    });
    return a ? (a.role as RoadmapAccessRoleValue) : null;
  }

  async setAccess(roadmapId: string, userId: string, role: RoadmapAccessRoleValue): Promise<void> {
    await this.prisma.roadmapAccess.upsert({
      where: { roadmapId_userId: { roadmapId, userId } },
      create: { roadmapId, userId, role },
      update: { role },
    });
  }

  async listAccess(roadmapId: string) {
    return this.prisma.roadmapAccess.findMany({
      where: { roadmapId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async revokeAccess(roadmapId: string, userId: string): Promise<void> {
    const access = await this.prisma.roadmapAccess.findUnique({
      where: { roadmapId_userId: { roadmapId, userId } },
    });
    if (!access) return;
    if (access.role === 'OWNER') {
      const owners = await this.prisma.roadmapAccess.count({ where: { roadmapId, role: 'OWNER' } });
      if (owners <= 1) throw new Error('Cannot remove the last roadmap owner');
    }
    await this.prisma.roadmapAccess.delete({
      where: { roadmapId_userId: { roadmapId, userId } },
    });
  }

  async getDetail(roadmapId: string, role: RoadmapAccessRoleValue): Promise<RoadmapDetail> {
    await new RoadmapMembershipService(this.prisma).reconcile(roadmapId);

    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id: roadmapId },
      select: { id: true, name: true, description: true, hiddenSystemColumns: true },
    });
    if (!roadmap) throw new Error('ROADMAP_NOT_FOUND');

    const rows = await this.prisma.roadmapGroup.findMany({
      where: { roadmapId },
      orderBy: { position: 'asc' },
      select: {
        groupId: true,
        position: true,
        group: {
          select: {
            id: true,
            name: true,
            color: true,
            boardId: true,
            board: { select: { id: true, name: true } },
            projects: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true, name: true, status: true, statusId: true, ownerId: true,
                owner: true, order: true, groupId: true, boardId: true,
                startDate: true, endDate: true, durationCode: true,
                fieldValues: { select: { columnId: true, value: true } },
              },
            },
          },
        },
      },
    });

    // Resolve the per-board "Size" column so we can read each item's size label.
    const boardIds = Array.from(
      new Set(rows.map((r) => r.group.boardId).filter(Boolean) as string[]),
    );
    const sizeCols = boardIds.length
      ? await this.prisma.boardColumn.findMany({
          where: { boardId: { in: boardIds }, name: 'Size', type: 'STATUS' },
          select: { id: true, boardId: true },
        })
      : [];
    const sizeColByBoard = new Map(sizeCols.map((c) => [c.boardId, c.id]));

    // Size durations are roadmap-wide: read from the GANTT view's config (defaults if absent).
    const ganttView = await this.prisma.roadmapView.findFirst({
      where: { roadmapId, type: 'GANTT' },
      select: { ganttConfig: { select: { sizeDurations: true } } },
    });
    const durations = (ganttView?.ganttConfig?.sizeDurations ?? {}) as SizeDurations;

    const groups = rows.map((r) => {
      const g = r.group;
      const sizeColId = g.boardId ? sizeColByBoard.get(g.boardId) : undefined;
      return {
        groupId: g.id,
        name: g.name,
        color: g.color,
        position: r.position,
        boardId: g.boardId ?? '',
        boardName: g.board?.name ?? '(unknown board)',
        items: g.projects.map((p) => {
          const sizeLabel = sizeColId
            ? (p.fieldValues.find((fv) => fv.columnId === sizeColId)?.value ?? null)
            : null;
          return {
            id: p.id, name: p.name, boardId: p.boardId ?? '', groupId: p.groupId ?? '',
            status: String(p.status), statusId: p.statusId, ownerId: p.ownerId,
            owner: p.owner, order: p.order,
            sizeLabel, sizeWeeks: sizeWeeksFromLabel(sizeLabel, durations),
            startDate: p.startDate ? (p.startDate as Date).toISOString() : null,
            endDate: p.endDate ? (p.endDate as Date).toISOString() : null,
            durationCode: p.durationCode ?? null,
          };
        }),
      };
    });

    const ganttConfig = await new RoadmapGanttConfigService(this.prisma).ensure(roadmapId);

    return {
      id: roadmap.id,
      name: roadmap.name,
      description: roadmap.description,
      hiddenSystemColumns: (roadmap.hiddenSystemColumns as SystemColumnKey[]) ?? [],
      role,
      groups,
      ganttConfig,
    };
  }
}
