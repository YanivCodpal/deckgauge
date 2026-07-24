import type { PrismaClient } from '@deckgauge/db';
import type { BulkBindResponse } from '@deckgauge/shared';
import { computeTier, estimateBackfillCost } from '@deckgauge/shared';

// Surface the repo sync's `repoFullName` + last-sync timestamp so the
// board-sources UI (`CodeIntelZone` via hydrateGitHub) can render the
// connection's code-sync state instead of defaulting to "unavailable".
// The bulk-repo sync model has no per-repo `syncPrs/syncCommits` toggles and
// tracks the last successful sync as `lastSuccessAt` (not `lastSyncedAt`).
const GITHUB_SYNC_INCLUDE = {
  gitHubRepoSync: {
    select: {
      id: true,
      repoFullName: true,
      githubInstanceId: true,
      lastSuccessAt: true,
    },
  },
} as const;

export class BoardGitHubSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(boardId: string) {
    return this.prisma.boardGitHubSource.findMany({
      where: { boardId },
      include: GITHUB_SYNC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async attach(input: {
    boardId: string;
    gitHubRepoSyncId: string;
    targetGroupId?: string | null;
    allowedLabels?: string[];
    allowedTypes?: string[];
    includeClosedIssues?: boolean;
    statusMapping?: Record<string, string>;
    defaultSyncedFields?: string[];
    syncIssuesToBoard?: boolean;
    useForIntelligence?: boolean;
  }) {
    return this.prisma.boardGitHubSource.create({ data: input, include: GITHUB_SYNC_INCLUDE });
  }

  async update(
    id: string,
    patch: Partial<{
      targetGroupId: string | null;
      allowedLabels: string[];
      allowedTypes: string[];
      includeClosedIssues: boolean;
      statusMapping: Record<string, string>;
      defaultSyncedFields: string[];
      syncIssuesToBoard: boolean;
      useForIntelligence: boolean;
    }>,
  ) {
    return this.prisma.boardGitHubSource.update({ where: { id }, data: patch });
  }

  async detach(id: string): Promise<void> {
    await this.prisma.boardGitHubSource.delete({ where: { id } });
  }
}

export interface QueueClient {
  enqueueInitialBackfill(repoSyncId: string, tier: 'hot' | 'warm' | 'cold'): Promise<void>;
  removeRepeatables(repoSyncId: string): Promise<void>;
}

export interface BulkBindArgs {
  prisma: PrismaClient;
  queueClient: QueueClient;
  boardId: string;
  instanceId: string;
  repos: string[];
  backfillMonths: number;
  targetGroupId?: string | null;
  repoMetadata?: Record<
    string,
    {
      defaultBranch: string;
      language: string | null;
      topics: string[];
      lastPushedAt: Date | null;
      openIssuesCount: number;
    }
  >;
}

export async function bulkBind(args: BulkBindArgs): Promise<BulkBindResponse> {
  let added = 0;
  let reEnabled = 0;
  let skipped = 0;

  for (const fullName of args.repos) {
    const meta = args.repoMetadata?.[fullName] ?? {
      defaultBranch: 'main',
      language: null,
      topics: [],
      lastPushedAt: null,
      openIssuesCount: 0,
    };
    const tier = computeTier(meta.lastPushedAt);

    const sync = await args.prisma.gitHubRepoSync.upsert({
      where: {
        githubInstanceId_repoFullName: {
          githubInstanceId: args.instanceId,
          repoFullName: fullName,
        },
      },
      create: {
        githubInstanceId: args.instanceId,
        repoFullName: fullName,
        defaultBranch: meta.defaultBranch,
        language: meta.language,
        topics: meta.topics,
        lastPushedAt: meta.lastPushedAt,
        openIssuesCount: meta.openIssuesCount,
        tier,
        backfillMonths: args.backfillMonths,
      },
      update: {
        disabledAt: null,
        tier,
        lastPushedAt: meta.lastPushedAt ?? undefined,
        openIssuesCount: meta.openIssuesCount,
        backfillMonths: args.backfillMonths,
      },
    });

    if (sync.backfillCompleteAt === null && sync.disabledAt === null) added += 1;
    else if (sync.disabledAt !== null) reEnabled += 1;
    else skipped += 1;

    await args.prisma.boardGitHubSource.upsert({
      where: {
        boardId_gitHubRepoSyncId: { boardId: args.boardId, gitHubRepoSyncId: sync.id },
      },
      create: {
        boardId: args.boardId,
        gitHubRepoSyncId: sync.id,
        targetGroupId: args.targetGroupId ?? null,
      },
      update: { targetGroupId: args.targetGroupId ?? undefined },
    });

    if (sync.backfillCompleteAt === null || sync.disabledAt !== null) {
      await args.queueClient.enqueueInitialBackfill(sync.id, tier);
    }
  }

  const cost = estimateBackfillCost(
    args.repos.map(
      (fn) =>
        args.repoMetadata?.[fn] ?? { openIssuesCount: 0, lastPushedAt: null },
    ),
    { backfillMonths: args.backfillMonths },
  );

  return {
    addedCount: added,
    reEnabledCount: reEnabled,
    skippedCount: skipped,
    estimatedBackfillRequests: cost.requests,
    estimatedBackfillMinutes: cost.minutes,
  };
}

export async function removeRepo(args: {
  prisma: PrismaClient;
  queueClient: QueueClient;
  boardId: string;
  boardGitHubSourceId: string;
}): Promise<void> {
  const bgs = await args.prisma.boardGitHubSource.findUniqueOrThrow({
    where: { id: args.boardGitHubSourceId },
  });
  await args.prisma.boardGitHubSource.delete({ where: { id: args.boardGitHubSourceId } });
  const remaining = await args.prisma.boardGitHubSource.count({
    where: { gitHubRepoSyncId: bgs.gitHubRepoSyncId },
  });
  if (remaining === 0) {
    await args.prisma.gitHubRepoSync.update({
      where: { id: bgs.gitHubRepoSyncId },
      data: { disabledAt: new Date() },
    });
    await args.queueClient.removeRepeatables(bgs.gitHubRepoSyncId);
  }
}
