// Shared between api (enqueue path) and worker (worker path).
// The actual BullMQ Queue instances are constructed by the caller and passed
// in — keeps this file free of BullMQ runtime imports and easy to test.

export const GITHUB_SYNC_TIER_INTERVAL_MS = {
  hot: 3_600_000,        // 1 hour
  warm: 21_600_000,      // 6 hours
  cold: 86_400_000,      // 24 hours
} as const satisfies Record<'hot' | 'warm' | 'cold', number>;

export const GITHUB_SYNC_QUEUE_NAMES = {
  hot: 'github-sync-hot',
  warm: 'github-sync-warm',
  cold: 'github-sync-cold',
} as const;

export interface BullMqQueueLike {
  add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown>;
  // id is `string | null | undefined` to match BullMQ's RepeatableJob shape.
  getRepeatableJobs(): Promise<Array<{ id?: string | null; key: string }>>;
  removeRepeatableByKey(key: string): Promise<boolean>;
}

export interface GitHubQueueClient {
  enqueueInitialBackfill(
    repoSyncId: string,
    tier: 'hot' | 'warm' | 'cold',
  ): Promise<void>;
  // Re-establish a repo's repeatable schedule without firing an immediate run.
  // For boot self-heal after a Redis wipe drops the tier schedules.
  ensureScheduled(repoSyncId: string, tier: 'hot' | 'warm' | 'cold'): Promise<void>;
  removeRepeatables(repoSyncId: string): Promise<void>;
}

export function makeGitHubQueueClient(queues: {
  hot: BullMqQueueLike;
  warm: BullMqQueueLike;
  cold: BullMqQueueLike;
}): GitHubQueueClient {
  return {
    async enqueueInitialBackfill(repoSyncId, tier) {
      // `immediately: true` fires the first run as soon as it's enqueued.
      // Without it, a repeatable with `every` schedules its first run a full
      // interval out (up to 24h for the cold tier), so an "initial backfill"
      // would not actually start until then. Re-adding the same repeatable is
      // idempotent: BullMQ keys the schedule on the repeat options + jobId, so
      // a duplicate add updates the existing schedule rather than creating a
      // second one (the next run time stays put on its wall-clock boundary).
      await queues[tier].add(
        repoSyncId,
        { repoSyncId },
        {
          repeat: { every: GITHUB_SYNC_TIER_INTERVAL_MS[tier], immediately: true },
          jobId: repoSyncId,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    },
    async ensureScheduled(repoSyncId, tier) {
      // No `immediately: true` — this only guarantees the repeatable exists so
      // the tier's periodic sync resumes at its next interval boundary. Running
      // it for every active repo on each boot must NOT trigger a full re-sync
      // storm; the manual button / initial backfill cover on-demand freshness.
      // Idempotent: re-adding the same jobId keeps the existing next-run time.
      await queues[tier].add(
        repoSyncId,
        { repoSyncId },
        {
          repeat: { every: GITHUB_SYNC_TIER_INTERVAL_MS[tier] },
          jobId: repoSyncId,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    },
    async removeRepeatables(repoSyncId) {
      for (const q of [queues.hot, queues.warm, queues.cold]) {
        const reps = await q.getRepeatableJobs();
        for (const r of reps) {
          if (r.id === repoSyncId) await q.removeRepeatableByKey(r.key);
        }
      }
    },
  };
}
