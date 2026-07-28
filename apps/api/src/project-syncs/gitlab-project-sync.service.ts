import type { PrismaClient } from '@deckgauge/db';

export interface GitLabProjectSyncRow {
  id: string;
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs: boolean;
  syncCommits: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export class GitLabProjectSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<GitLabProjectSyncRow[]> {
    const rows = await this.prisma.gitLabProjectSync.findMany({
      include: { _count: { select: { boardSources: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      gitlabInstanceId: r.gitlabInstanceId,
      projectPath: r.projectPath,
      syncPrs: r.syncPrs,
      syncCommits: r.syncCommits,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      boardCount: r._count.boardSources,
    }));
  }

  async create(input: {
    gitlabInstanceId: string;
    projectPath: string;
    syncPrs: boolean;
    syncCommits: boolean;
  }) {
    return this.prisma.gitLabProjectSync.create({ data: input });
  }

  async update(id: string, patch: Partial<{ syncPrs: boolean; syncCommits: boolean }>) {
    return this.prisma.gitLabProjectSync.update({ where: { id }, data: patch });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.gitLabProjectSync.delete({ where: { id } });
  }

  async ensureSync(gitlabInstanceId: string, projectPath: string) {
    // Default the code-sync flags ON. This is the path the board "add source"
    // flow uses, and the board UI exposes no commits/PRs toggle for GitLab
    // (unlike ADO). Creating with the flags off meant a GitLab source added
    // from a board silently never synced commits/MRs — the SuperPay bug.
    return this.prisma.gitLabProjectSync.upsert({
      where: { gitlabInstanceId_projectPath: { gitlabInstanceId, projectPath } },
      update: {},
      create: { gitlabInstanceId, projectPath, syncPrs: true, syncCommits: true },
    });
  }
}
