import type { PrismaClient } from '@deckgauge/db';

// Surface the project sync's `lastSyncedAt` so the board-sources UI can show
// the connection's true last sync time. Jira has no code-sync flags (issue
// tracker only), so no syncPrs/syncCommits to expose.
const JIRA_SYNC_INCLUDE = {
  jiraProjectSync: {
    select: {
      id: true,
      jiraProjectKey: true,
      jiraInstanceId: true,
      lastSyncedAt: true,
    },
  },
} as const;

export class BoardJiraSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(boardId: string) {
    return this.prisma.boardJiraSource.findMany({
      where: { boardId },
      include: JIRA_SYNC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async attach(input: {
    boardId: string;
    jiraProjectSyncId: string;
    targetGroupId?: string | null;
    allowedIssueTypes?: string[];
    statusMapping?: Record<string, string>;
    defaultSyncedFields?: string[];
    jqlFilter?: string | null;
  }) {
    return this.prisma.boardJiraSource.create({ data: input, include: JIRA_SYNC_INCLUDE });
  }

  async update(
    id: string,
    patch: Partial<{
      targetGroupId: string | null;
      allowedIssueTypes: string[];
      statusMapping: Record<string, string>;
      defaultSyncedFields: string[];
      jqlFilter: string | null;
    }>,
  ) {
    return this.prisma.boardJiraSource.update({ where: { id }, data: patch });
  }

  async detach(id: string): Promise<void> {
    await this.prisma.boardJiraSource.delete({ where: { id } });
  }
}
