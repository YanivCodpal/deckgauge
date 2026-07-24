import type { PrismaClient } from '@deckgauge/db';
import type { JiraProjectSyncDto } from '@deckgauge/shared';

export class JiraProjectSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<JiraProjectSyncDto[]> {
    const rows = await this.prisma.jiraProjectSync.findMany({
      include: { _count: { select: { boardSources: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      jiraInstanceId: r.jiraInstanceId,
      jiraProjectKey: r.jiraProjectKey,
      syncChangelog: r.syncChangelog,
      syncWorklogs: r.syncWorklogs,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      boardCount: r._count.boardSources,
    }));
  }

  async create(input: { jiraInstanceId: string; jiraProjectKey: string; syncChangelog: boolean; syncWorklogs: boolean }) {
    return this.prisma.jiraProjectSync.create({ data: input });
  }

  async update(id: string, patch: Partial<{ syncChangelog: boolean; syncWorklogs: boolean }>) {
    return this.prisma.jiraProjectSync.update({ where: { id }, data: patch });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.jiraProjectSync.delete({ where: { id } });
  }

  async ensureSync(jiraInstanceId: string, jiraProjectKey: string) {
    return this.prisma.jiraProjectSync.upsert({
      where: { jiraInstanceId_jiraProjectKey: { jiraInstanceId, jiraProjectKey } },
      update: {},
      create: { jiraInstanceId, jiraProjectKey, syncChangelog: true, syncWorklogs: false },
    });
  }
}
