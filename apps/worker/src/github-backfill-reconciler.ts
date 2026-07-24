// Startup reconciliation for GitHub per-repo intelligence backfills.
//
// Per-repo backfill jobs are normally enqueued by the api's bulkBind when a
// repo is attached to a board. If that enqueue ever fails to reach the
// three-tier queues — e.g. the api booted without REDIS_URL and fell back to
// the no-op queue client, or a repo's earlier backfill never completed
// because inserts were erroring — the repo is left with backfillCompleteAt
// NULL and no scheduled job, so its commits/PRs are never pulled.
//
// This reconciler re-enqueues an initial backfill for every active repo that
// has not completed one. enqueueInitialBackfill is idempotent — BullMQ keys
// the repeatable on its repeat options + jobId, so a duplicate add updates the
// existing schedule instead of creating a second one — making it safe to run
// on every worker boot. backfillCompleteAt is only set on a fully clean run
// (see github-intelligence-sync.handler), so a healthy repo drops out of this
// set after its first success; a repo that keeps failing is retried each boot,
// which is bounded by the shared GitHub rate limiter.

type Tier = 'hot' | 'warm' | 'cold';

const VALID_TIERS: ReadonlySet<string> = new Set<Tier>(['hot', 'warm', 'cold']);

export interface BackfillQueueClient {
  enqueueInitialBackfill(repoSyncId: string, tier: Tier): Promise<void>;
}

// Minimal structural view of the Prisma client — just the one query we need.
// Keeps the reconciler trivially testable without a full PrismaClient.
export interface RepoSyncFinder {
  gitHubRepoSync: {
    findMany(args: {
      where: { disabledAt: null; backfillCompleteAt: null };
      select: { id: true; tier: true };
    }): Promise<Array<{ id: string; tier: string }>>;
  };
}

export async function reconcileGitHubBackfills(deps: {
  prisma: RepoSyncFinder;
  queueClient: BackfillQueueClient;
  log?: (message: string) => void;
}): Promise<{ enqueued: number }> {
  const pending = await deps.prisma.gitHubRepoSync.findMany({
    where: { disabledAt: null, backfillCompleteAt: null },
    select: { id: true, tier: true },
  });

  let enqueued = 0;
  for (const repo of pending) {
    const tier: Tier = VALID_TIERS.has(repo.tier) ? (repo.tier as Tier) : 'cold';
    await deps.queueClient.enqueueInitialBackfill(repo.id, tier);
    enqueued += 1;
  }

  if (enqueued > 0) {
    deps.log?.(`[GitHub backfill reconciler] enqueued ${enqueued} pending repo sync(s)`);
  }
  return { enqueued };
}
