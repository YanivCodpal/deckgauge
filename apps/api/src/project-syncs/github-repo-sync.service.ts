import type { PrismaClient } from '@deckgauge/db';

export interface GitHubRepoSyncRow {
  id: string;
  githubInstanceId: string;
  repoFullName: string;
  // Tier replaces the per-repo syncPrs/syncCommits flags removed in Task 16.
  // Tier governs how often the three-tier BullMQ queue re-runs the per-repo
  // bulk sync (hot=1h, warm=6h, cold=24h).
  tier: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export class GitHubRepoSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<GitHubRepoSyncRow[]> {
    const rows = await this.prisma.gitHubRepoSync.findMany({
      include: { _count: { select: { boardSources: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      githubInstanceId: r.githubInstanceId,
      repoFullName: r.repoFullName,
      tier: r.tier,
      lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: r.lastErrorAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      boardCount: r._count.boardSources,
    }));
  }

  async create(input: { githubInstanceId: string; repoFullName: string }) {
    return this.prisma.gitHubRepoSync.create({ data: input });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.gitHubRepoSync.delete({ where: { id } });
  }

  async ensureSync(githubInstanceId: string, repoFullName: string) {
    return this.prisma.gitHubRepoSync.upsert({
      where: { githubInstanceId_repoFullName: { githubInstanceId, repoFullName } },
      update: {},
      create: { githubInstanceId, repoFullName },
    });
  }
}
