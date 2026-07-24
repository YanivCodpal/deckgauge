import type { PrismaClient } from '@deckgauge/db';

// Surface the project sync's `syncPrs/syncCommits/syncRepos/syncAllRepos/lastSyncedAt`
// to the board-sources UI. Without these, `CodeIntelZone` (via hydrateAdo)
// always reads `connection.syncPrs === false` and renders "unavailable"
// even when PR + commit sync are enabled on the connection. `syncAllRepos`
// lets the wizard edit the code-sync scope inline instead of the Connections page.
const ADO_SYNC_INCLUDE = {
  azureDevOpsProjectSync: {
    select: {
      id: true,
      adoProject: true,
      azureDevOpsInstanceId: true,
      syncPrs: true,
      syncCommits: true,
      syncRepos: true,
      syncAllRepos: true,
      lastSyncedAt: true,
    },
  },
} as const;

export class BoardAdoSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(boardId: string) {
    return this.prisma.boardAdoSource.findMany({
      where: { boardId },
      include: ADO_SYNC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async attach(input: {
    boardId: string;
    azureDevOpsProjectSyncId: string;
    targetGroupId?: string | null;
    allowedWorkItemTypes?: string[];
    wiqlFilter?: string | null;
    statusMapping?: Record<string, string>;
    defaultSyncedFields?: string[];
    syncWorkItemsToBoard?: boolean;
    useForIntelligence?: boolean;
  }) {
    return this.prisma.boardAdoSource.create({ data: input, include: ADO_SYNC_INCLUDE });
  }

  async update(
    id: string,
    patch: Partial<{
      targetGroupId: string | null;
      allowedWorkItemTypes: string[];
      wiqlFilter: string | null;
      statusMapping: Record<string, string>;
      defaultSyncedFields: string[];
      syncWorkItemsToBoard: boolean;
      useForIntelligence: boolean;
    }>,
  ) {
    return this.prisma.boardAdoSource.update({ where: { id }, data: patch });
  }

  async detach(id: string): Promise<void> {
    await this.prisma.boardAdoSource.delete({ where: { id } });
  }
}
