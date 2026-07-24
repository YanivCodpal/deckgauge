// Startup reconciliation for org-tree Microsoft Graph source syncs.
//
// runOrgSourceSync sets OrgTreeSource.status = 'syncing' at the top of a run and
// relies on reaching a terminal update ('idle' on success, 'error' on failure).
// If the worker process is killed mid-run — a container restart, an OOM, a
// deploy — the row is left stuck at 'syncing' with no job in the queue to ever
// finish it. The Source tab disables "Sync now" whenever status === 'syncing'
// (apps/web/app/org/[orgTreeId]/SourceTab.tsx), so a stuck row hangs the button
// permanently with no way to recover from the UI.
//
// This reconciler runs on every worker boot and flips any orphaned 'syncing'
// row to 'error' with an actionable summary, re-enabling the button. It only
// matches 'syncing' rows, so 'idle'/'error' rows are untouched, and it is safe
// to run on every boot. There is a narrow, benign race: a job this same worker
// pulls at boot (BullMQ workers autorun) could set 'syncing' around the same
// time, and if the worker were ever scaled past one replica a booting worker
// could flip another replica's in-flight row. In both cases the running job
// still writes its own terminal status ('idle'/'error') on completion, so any
// false 'error' is transient and self-corrects.

export const INTERRUPTED_SYNC_SUMMARY = {
  created: 0,
  updated: 0,
  departed: 0,
  skipped: 0,
  errors: ['Previous sync was interrupted (worker restart). Please sync again.'],
} as const;

// Minimal structural view of the Prisma client — just the one query we need.
// Keeps the reconciler trivially testable without a full PrismaClient.
export interface OrgSourceReconcileClient {
  orgTreeSource: {
    updateMany(args: {
      where: { status: string };
      data: { status: string; lastSyncSummary: object };
    }): Promise<{ count: number }>;
  };
}

export async function reconcileOrgSourceSync(deps: {
  prisma: OrgSourceReconcileClient;
  log?: (message: string) => void;
}): Promise<{ reset: number }> {
  const { count } = await deps.prisma.orgTreeSource.updateMany({
    where: { status: 'syncing' },
    data: { status: 'error', lastSyncSummary: { ...INTERRUPTED_SYNC_SUMMARY } },
  });

  if (count > 0) {
    deps.log?.(`[org-source reconciler] reset ${count} interrupted sync(s) to error`);
  }
  return { reset: count };
}
