import type { PrismaClient } from '@deckgauge/db';
import {
  sizeWeeksFromLabel,
  type RoadmapConfigPayload,
  type SizeDurations,
} from '@deckgauge/shared';
import { RoadmapConfigService } from './roadmap-config.service.js';

export interface RoadmapProjectPayload {
  id: string;
  name: string;
  status: string;
  groupId: string | null;
  order: number | null;
  /** partition key for parallel tracks: BoardOwner id, else the owner string */
  assigneeId: string | null;
  /** display owner (the project's `owner` string) */
  owner: string;
  sizeLabel: string | null;
  sizeWeeks: number | null;
  startDate: string | null;
  endDate: string | null;
  durationCode: string | null;
}

export interface RoadmapGroupPayload {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface RoadmapViewPayload {
  config: RoadmapConfigPayload;
  groups: RoadmapGroupPayload[];
  projects: RoadmapProjectPayload[];
}

export class RoadmapService {
  private readonly configService: RoadmapConfigService;
  constructor(private readonly prisma: PrismaClient) {
    this.configService = new RoadmapConfigService(prisma);
  }

  async loadView(boardId: string, viewId: string): Promise<RoadmapViewPayload> {
    const view = await this.prisma.boardView.findUnique({ where: { id: viewId } });
    if (!view || view.boardId !== boardId) throw new Error('VIEW_NOT_FOUND');

    const config = await this.configService.getOrCreate(viewId);

    const groups = await this.prisma.group.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, color: true, position: true },
    });

    const sizeColumn = await this.prisma.boardColumn.findFirst({
      where: { boardId, name: 'Size', type: 'STATUS' },
      select: { id: true },
    });

    const projects = await this.prisma.project.findMany({
      where: { boardId },
      select: {
        id: true,
        name: true,
        status: true,
        groupId: true,
        order: true,
        ownerId: true,
        owner: true,
        startDate: true,
        endDate: true,
        durationCode: true,
        fieldValues: sizeColumn
          ? { where: { columnId: sizeColumn.id }, select: { columnId: true, value: true } }
          : false,
      },
    });

    const durations = config.sizeDurations as SizeDurations;

    return {
      config,
      groups,
      projects: projects.map((p) => {
        const fv = (p as { fieldValues?: Array<{ value: string }> }).fieldValues;
        const sizeLabel = fv && fv.length > 0 ? fv[0]!.value : null;
        const ownerStr = (p as { owner?: string }).owner ?? '';
        const ownerTrimmed = ownerStr.trim();
        return {
          id: p.id,
          name: p.name,
          status: String(p.status),
          groupId: p.groupId,
          order: p.order,
          // Parallel tracks key off the structured BoardOwner when set, else
          // fall back to the free-text owner so distinct owners run in parallel.
          assigneeId: p.ownerId ?? (ownerTrimmed.length > 0 ? ownerTrimmed : null),
          owner: ownerStr,
          sizeLabel,
          sizeWeeks: sizeWeeksFromLabel(sizeLabel, durations),
          startDate: p.startDate ? p.startDate.toISOString() : null,
          endDate: p.endDate ? p.endDate.toISOString() : null,
          durationCode: p.durationCode ?? null,
        };
      }),
    };
  }

  async setSchedule(
    boardId: string,
    projectId: string,
    input: { startDate?: string | null; endDate?: string | null; durationCode?: string | null },
  ): Promise<{ id: string; startDate: string | null; endDate: string | null; durationCode: string | null }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, boardId },
      select: { id: true },
    });
    if (!project) throw new Error('PROJECT_NOT_FOUND');

    const data: { startDate?: Date | null; endDate?: Date | null; durationCode?: string | null } = {};
    if ('startDate' in input) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if ('endDate' in input) data.endDate = input.endDate ? new Date(input.endDate) : null;
    if ('durationCode' in input) data.durationCode = input.durationCode ?? null;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data,
      select: { id: true, startDate: true, endDate: true, durationCode: true },
    });
    return {
      id: updated.id,
      startDate: updated.startDate ? updated.startDate.toISOString() : null,
      endDate: updated.endDate ? updated.endDate.toISOString() : null,
      durationCode: updated.durationCode ?? null,
    };
  }
}
