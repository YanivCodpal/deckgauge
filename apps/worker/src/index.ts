import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Queue, Worker } from 'bullmq'
import { PrismaClient, clickhouse, chInsertMany } from '@deckgauge/db'
import {
  FakeJiraAdapter,
  JiraCloudAdapter,
  GitHubRestAdapter,
  FakeGitHubAdapter,
  FakeGitHubProjectsAdapter,
  GitHubProjectsGraphQLAdapter,
  FakeAzureDevOpsAdapter,
  AzureDevOpsRestAdapter,
  GitLabPrAdapter,
  GitLabCommitAdapter,
  FakeGitLabPrAdapter,
  FakeGitLabCommitAdapter,
  JiraIntelligenceAdapter,
  FakeJiraIntelligenceAdapter,
  AdoPrAdapter,
  FakeAdoPrAdapter,
  AdoCommitAdapter,
  FakeAdoCommitAdapter,
} from '@deckgauge/shared'
import { loadAzureDevOpsConfig } from '@deckgauge/shared/azure-devops-config'
import { handleSyncJob } from './jira-sync.handler.js'
import { handleGitHubSyncJob, GitHubProjectsAdapterFactory } from './github-sync.handler.js'
import { handleAzureDevOpsSyncJob } from './azure-devops-sync.handler.js'
import { handleGitLabSyncJob } from './gitlab-sync.handler.js'
import { handleJiraIntelligenceSync } from './jira-intelligence-sync.handler.js'
import { runIntelligenceSync } from './github-intelligence-sync.handler.js'
import { handleAdoIntelligenceSync } from './ado-intelligence-sync.handler.js'
import { Octokit } from '@octokit/rest'
import { GITHUB_SYNC_QUEUE_NAMES, makeGitHubQueueClient } from '@deckgauge/shared'
import { RateLimiter } from './github-rate-limiter.js'
import { reconcileGitHubBackfills } from './github-backfill-reconciler.js'
import { handleOrgTreeSyncJob } from './org-tree-sync/org-tree-sync.processor.js'
import { handleOrgSourceSyncJob } from './org-source-sync/org-source-sync.processor.js'
import { reconcileOrgSourceSync } from './org-source-sync/reconcile-org-source-sync.js'
import { handleCalendarSourceSyncJob } from './calendar-source-sync/calendar-source-sync.handler.js'
import {
  FakeCalendarClient,
  GraphCalendarClient,
  type CalendarClient,
} from './calendar-source-sync/graph-calendar-client.js'
import {
  FakeGraphDirectoryClient,
  DelegatedGraphDirectoryClient,
  StaticTokenGraphDirectoryClient,
  type GraphDirectoryClient,
} from './org-source-sync/graph-directory-client.js'

// Load .env from the repository root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const envPath = path.join(rootDir, '.env')

config({ path: envPath })

const REDIS_URL = process.env.REDIS_URL

if (!REDIS_URL) {
  console.error('Error: REDIS_URL environment variable is not set')
  process.exit(1)
}

// Initialize Prisma client
const db = new PrismaClient()

const jiraAdapterFactory = (cfg: {
  atlassianUrl: string
  email: string
  apiToken: string
  projectKeys: string[]
}) => {
  if (process.env.USE_FAKE_JIRA === 'true') {
    return new FakeJiraAdapter()
  }
  return new JiraCloudAdapter(cfg)
}

async function bootstrapAdoFromYaml() {
  const instanceCount = await db.azureDevOpsInstance.count();
  if (instanceCount > 0) return;

  try {
    const configPath = process.env.ADO_CONFIG_PATH
      ? path.join(rootDir, process.env.ADO_CONFIG_PATH)
      : path.join(rootDir, 'config', 'azure-devops.yaml');
    const yamlConfig = loadAzureDevOpsConfig(configPath);
    for (const inst of yamlConfig.instances) {
      await db.azureDevOpsInstance.create({
        data: {
          name: inst.name,
          orgUrl: inst.orgUrl,
          authMethod: inst.authMethod as 'PAT' | 'BASIC',
          accessToken: inst.accessToken,
          username: inst.username ?? null,
          projects: inst.projects,
        },
      });
    }
    console.log('Bootstrapped AzureDevOpsInstance(s) from config/azure-devops.yaml');
  } catch {
    console.log('No azure-devops.yaml found or parse error — skipping ADO YAML bootstrap');
  }
}

await bootstrapAdoFromYaml();

const connection = { url: REDIS_URL }

// Thin ChClient wrapper around the shared @clickhouse/client singleton.
// Defined here (rather than next to GitLab) so the jira-sync worker below can
// reuse it for the P4.4 dual-write into ClickHouse.
const chClient = {
  async insertRows(table: string, rows: ReadonlyArray<Record<string, unknown>>): Promise<void> {
    if (rows.length === 0) return
    await chInsertMany(table, rows as Array<Record<string, unknown>>)
  },
}
void clickhouse // keep import referenced for future direct queries

const queue = new Queue('jira-sync', { connection })
const worker = new Worker(
  'jira-sync',
  async (job) => {
    const trigger = job.data?.trigger || 'scheduled'
    console.log(`Processing jira-sync job (trigger: ${trigger})`)
    return handleSyncJob(job.data ?? { trigger }, db, jiraAdapterFactory, chClient)
  },
  { connection }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`)
})

// Enqueue startup job
await queue.add('jira-sync', { trigger: 'startup' }, { jobId: 'startup-job' })

// Schedule repeating job every 15 minutes with dedup
const repeatInterval = process.env.CRON_INTERVAL ? parseInt(process.env.CRON_INTERVAL) : 15 * 60 * 1000
try {
  await queue.add(
    'jira-sync',
    { trigger: 'scheduled' },
    {
      repeat: {
        every: repeatInterval,
      },
      jobId: 'jira-sync-scheduled',
    }
  )
} catch {
  // If the job already exists, this will throw - that's ok, we have dedup
  console.debug('Repeatable job already exists (dedup applied)')
}

// ── EI-014: GitLab sync queue ──────────────────────────────────────────────
const gitlabPrAdapterFactory = (cfg: {
  accessToken: string
  baseUrl?: string
  instanceId: string
}) => {
  if (process.env.USE_FAKE_GITLAB === 'true') {
    return new FakeGitLabPrAdapter([])
  }
  return new GitLabPrAdapter(cfg)
}

const gitlabCommitAdapterFactory = (cfg: {
  accessToken: string
  baseUrl?: string
  instanceId: string
}) => {
  if (process.env.USE_FAKE_GITLAB === 'true') {
    return new FakeGitLabCommitAdapter([])
  }
  return new GitLabCommitAdapter(cfg)
}

const gitlabQueue = new Queue('gitlab-sync', { connection })
const gitlabWorker = new Worker(
  'gitlab-sync',
  async (job) => {
    const trigger = job.data?.trigger || 'scheduled'
    console.log(`Processing gitlab-sync job (trigger: ${trigger})`)
    return handleGitLabSyncJob(
      job.data ?? { trigger },
      db,
      gitlabPrAdapterFactory,
      gitlabCommitAdapterFactory,
      chClient,
    )
  },
  { connection },
)

gitlabWorker.on('completed', (job) => {
  console.log(`GitLab job ${job.id} completed`)
})
gitlabWorker.on('failed', (job, err) => {
  console.error(`GitLab job ${job?.id} failed: ${err.message}`)
})

try {
  await gitlabQueue.add(
    'gitlab-sync',
    { trigger: 'scheduled' },
    {
      repeat: { every: repeatInterval },
      jobId: 'gitlab-sync-scheduled',
    },
  )
} catch {
  console.debug('Repeatable gitlab-sync job already exists (dedup applied)')
}

// ── EI-012/013/015: Phase 3 intelligence sync queues ───────────────────────
const jiraIntelFactory = (cfg: { atlassianUrl: string; email: string; apiToken: string }) => {
  if (process.env.USE_FAKE_JIRA === 'true') {
    return new FakeJiraIntelligenceAdapter({ issues: [], transitions: [] })
  }
  return new JiraIntelligenceAdapter(cfg)
}

const adoPrFactory = (cfg: { orgUrl: string; authMethod: 'PAT' | 'BASIC'; accessToken: string; username?: string; instanceId: string }) => {
  if (process.env.USE_FAKE_ADO === 'true') {
    return new FakeAdoPrAdapter([])
  }
  return new AdoPrAdapter(cfg)
}

const adoCommitFactory = (cfg: { orgUrl: string; authMethod: 'PAT' | 'BASIC'; accessToken: string; username?: string; instanceId: string }) => {
  if (process.env.USE_FAKE_ADO === 'true') {
    return new FakeAdoCommitAdapter([])
  }
  return new AdoCommitAdapter(cfg)
}

function makeIntelligenceQueue(name: string, handler: (jobData: { trigger?: string }) => Promise<unknown>) {
  const q = new Queue(name, { connection })
  const w = new Worker(
    name,
    async (job) => {
      console.log(`Processing ${name} job (trigger: ${job.data?.trigger || 'scheduled'})`)
      return handler(job.data ?? { trigger: 'scheduled' })
    },
    {
      connection,
      lockDuration: 10 * 60 * 1000,
      lockRenewTime: 4 * 60 * 1000,
      concurrency: 1,
    },
  )
  w.on('completed', (job) => {
    // Surface the handler result (rows written + per-repo errors). These syncs
    // catch per-repo failures into result.errors and still "complete", so
    // without this a broken commit/PR sync is silently invisible.
    const rv = job.returnvalue as { errors?: unknown[] } | undefined
    const summary = rv ? ` ${JSON.stringify(rv)}` : ''
    console.log(`${name} job ${job.id} completed:${summary}`)
    if (rv?.errors && rv.errors.length > 0) {
      console.error(`${name} job ${job.id} had ${rv.errors.length} error(s)`)
    }
  })
  w.on('failed', (job, err) => console.error(`${name} job ${job?.id} failed: ${err.message}`))
  return q
}

const jiraIntelQueue = makeIntelligenceQueue('jira-intelligence-sync', (data) =>
  handleJiraIntelligenceSync(data as never, db, jiraIntelFactory, chClient),
)
const adoIntelQueue = makeIntelligenceQueue('ado-intelligence-sync', (data) =>
  handleAdoIntelligenceSync(data as never, db, adoPrFactory, adoCommitFactory, chClient),
)

for (const q of [jiraIntelQueue, adoIntelQueue]) {
  try {
    await q.add(q.name, { trigger: 'scheduled' }, { repeat: { every: repeatInterval }, jobId: `${q.name}-scheduled` })
  } catch {
    console.debug(`Repeatable ${q.name} job already exists (dedup applied)`)
  }
}

// ── GitHub bulk-repo ingestion: three-tier sync queues ────────────────────
// Each tier has its own queue + worker. Repeatables are added per-repo by
// the api (bulkBind) — not at boot — so worker startup stays cheap.
const githubSyncHotQueue = new Queue(GITHUB_SYNC_QUEUE_NAMES.hot, { connection })
const githubSyncWarmQueue = new Queue(GITHUB_SYNC_QUEUE_NAMES.warm, { connection })
const githubSyncColdQueue = new Queue(GITHUB_SYNC_QUEUE_NAMES.cold, { connection })

const githubBulkRateLimiter = new RateLimiter({ budget: 4_000, refillMs: 3_600_000 })

function makeOctokitForInstance(instance: { accessToken: string; baseUrl: string | null }) {
  return new Octokit({ auth: instance.accessToken, baseUrl: instance.baseUrl ?? undefined })
}

function makeTierWorker(name: string, concurrency: number) {
  const w = new Worker(
    name,
    async (job) => {
      const repoSyncId = (job.data as { repoSyncId: string }).repoSyncId
      const sync = await db.gitHubRepoSync.findUniqueOrThrow({
        where: { id: repoSyncId },
        include: { githubInstance: true },
      })
      const octokit = makeOctokitForInstance(sync.githubInstance)
      await runIntelligenceSync(
        { prisma: db, octokit, rateLimiter: githubBulkRateLimiter, ch: chClient },
        repoSyncId,
      )
    },
    { connection, concurrency },
  )
  w.on('failed', (job, err) => console.error(`[${name}] job ${job?.id} failed: ${err.message}`))
  return w
}

makeTierWorker(GITHUB_SYNC_QUEUE_NAMES.hot, 4)
makeTierWorker(GITHUB_SYNC_QUEUE_NAMES.warm, 2)
makeTierWorker(GITHUB_SYNC_QUEUE_NAMES.cold, 1)

// Self-heal: re-enqueue an initial backfill for any active repo that never
// completed one (e.g. attached while the api's enqueue was a no-op, or whose
// earlier backfill kept erroring). Idempotent — re-adding the same repeatable
// updates its existing schedule rather than duplicating it, so this is safe to
// run on every boot. Without it, such repos stay stuck with no scheduled job
// and never surface commits/PRs in the intelligence board.
const githubBackfillQueueClient = makeGitHubQueueClient({
  hot: githubSyncHotQueue,
  warm: githubSyncWarmQueue,
  cold: githubSyncColdQueue,
})
try {
  await reconcileGitHubBackfills({
    prisma: db,
    queueClient: githubBackfillQueueClient,
    log: (message) => console.log(message),
  })
} catch (err) {
  console.error(
    `[GitHub backfill reconciler] failed: ${err instanceof Error ? err.message : String(err)}`,
  )
}

// Reference the queues so they aren't tree-shaken / treated as unused.
// (Queues are kept alive by being constructed; this satisfies the linter.)
void githubSyncHotQueue
void githubSyncWarmQueue
void githubSyncColdQueue

// ── Azure DevOps sync ───────────────────────────────────────────────────────

const adoQueue = new Queue('azure-devops-sync', { connection });
const adoAdapterFactory = (cfg: {
  orgUrl: string;
  authMethod: 'PAT' | 'BASIC';
  accessToken: string;
  username?: string;
}) => {
  if (process.env.USE_FAKE_AZURE_DEVOPS === 'true') {
    return new FakeAzureDevOpsAdapter();
  }
  return new AzureDevOpsRestAdapter(cfg);
};

const adoWorker = new Worker(
  'azure-devops-sync',
  async (job) => {
    const trigger = job.data?.trigger || 'scheduled';
    console.log(`Processing azure-devops-sync job (trigger: ${trigger})`);
    return handleAzureDevOpsSyncJob(job.data ?? { trigger }, db, adoAdapterFactory, chClient);
  },
  { connection },
);

adoWorker.on('completed', (job) => {
  console.log(`ADO job ${job.id} completed`);
});

adoWorker.on('failed', (job, err) => {
  console.error(`ADO job ${job?.id} failed: ${err.message}`);
});

// Enqueue ADO startup job
await adoQueue.add('azure-devops-sync', { trigger: 'startup' }, { jobId: 'ado-startup-job' });

// Schedule ADO repeating sync
try {
  await adoQueue.add(
    'azure-devops-sync',
    { trigger: 'scheduled' },
    { repeat: { every: repeatInterval }, jobId: 'ado-sync-scheduled' },
  );
} catch {
  console.debug('ADO repeatable job already exists (dedup applied)');
}

// ── GitHub sync ─────────────────────────────────────────────────────────────

const ghQueue = new Queue('github-sync', { connection });
const ghAdapterFactory = (cfg: { baseUrl: string; accessToken: string }) => {
  if (process.env.USE_FAKE_GITHUB === 'true') {
    return new FakeGitHubAdapter();
  }
  return new GitHubRestAdapter({ baseUrl: cfg.baseUrl, accessToken: cfg.accessToken });
};

const ghProjectsAdapterFactory: GitHubProjectsAdapterFactory = (cfg: {
  baseUrl: string;
  accessToken: string;
}) => {
  if (process.env.USE_FAKE_GITHUB === 'true') {
    return new FakeGitHubProjectsAdapter();
  }
  return new GitHubProjectsGraphQLAdapter({ baseUrl: cfg.baseUrl, accessToken: cfg.accessToken });
};

const ghWorker = new Worker(
  'github-sync',
  async (job) => {
    const trigger = job.data?.trigger || 'scheduled';
    console.log(`Processing github-sync job (trigger: ${trigger})`);
    return handleGitHubSyncJob(job.data ?? { trigger }, db, ghAdapterFactory, ghProjectsAdapterFactory, chClient);
  },
  { connection },
);

ghWorker.on('completed', (job) => {
  console.log(`GitHub job ${job.id} completed`);
});

ghWorker.on('failed', (job, err) => {
  console.error(`GitHub job ${job?.id} failed: ${err.message}`);
});

// Enqueue GitHub startup job
await ghQueue.add('github-sync', { trigger: 'startup' }, { jobId: 'gh-startup-job' });

// Schedule GitHub repeating sync
try {
  await ghQueue.add(
    'github-sync',
    { trigger: 'scheduled' },
    { repeat: { every: repeatInterval }, jobId: 'gh-sync-scheduled' },
  );
} catch {
  console.debug('GitHub repeatable job already exists (dedup applied)');
}

// Each org-source sync builds a directory client from the tree's OWN stored token.
// Primary path: a user-pasted Graph access token (no app registration at all).
// Fallback: a delegated refresh token from the device-code flow (needs
// MICROSOFT_TENANT_ID + MICROSOFT_CLIENT_ID; secret optional). USE_FAKE_GRAPH swaps
// in a fake for local dev. If no usable token/config the factory throws, which the
// processor records as an actionable sync error (never a silent empty roster).
const microsoftOAuthConfigured = Boolean(
  process.env.MICROSOFT_TENANT_ID && process.env.MICROSOFT_CLIENT_ID,
)
const makeGraphClient = (tokens: {
  accessToken?: string | null
  refreshToken?: string | null
}): GraphDirectoryClient => {
  if (process.env.USE_FAKE_GRAPH === 'true') return new FakeGraphDirectoryClient([], {})
  // Pasted access token — used directly, no app registration required.
  if (tokens.accessToken) return new StaticTokenGraphDirectoryClient(tokens.accessToken)
  // Delegated refresh token (device-code) — needs the app-registration ids.
  if (tokens.refreshToken) {
    if (!microsoftOAuthConfigured) {
      throw new Error(
        'Microsoft Graph is not configured on the server (set MICROSOFT_TENANT_ID / MICROSOFT_CLIENT_ID)',
      )
    }
    return new DelegatedGraphDirectoryClient({
      tenantId: process.env.MICROSOFT_TENANT_ID as string,
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || undefined,
      refreshToken: tokens.refreshToken,
    })
  }
  throw new Error('No Microsoft token available for this tree')
}

// ── Org-tree sync ──────────────────────────────────────────────────────────
const orgTreeSyncWorker = new Worker(
  'org-tree-sync',
  async (job) => {
    const treeId = job.data?.treeId as string
    console.log(`Processing org-tree-sync job for tree ${treeId}`)
    return handleOrgTreeSyncJob({ treeId }, db)
  },
  { connection },
)
orgTreeSyncWorker.on('failed', (job, err) =>
  console.error(`org-tree-sync ${job?.id} failed: ${err.message}`),
)

// ── Org-source sync (Microsoft Graph) ─────────────────────────────────────
const orgSourceSyncWorker = new Worker(
  'org-source-sync',
  async (job) => {
    const treeId = job.data?.treeId as string
    console.log(`Processing org-source-sync job for tree ${treeId}`)
    return handleOrgSourceSyncJob({ treeId }, db, makeGraphClient)
  },
  { connection },
)
orgSourceSyncWorker.on('failed', (job, err) =>
  console.error(`org-source-sync ${job?.id} failed: ${err.message}`),
)

// ── Calendar-source sync (recruitment board interviews via Microsoft Graph) ──
// A pasted Graph token is stored per board and passed into getCalendarView per call,
// so (unlike org-source) the client needs no per-tree token at construction.
const makeCalendarClient = (): CalendarClient =>
  process.env.USE_FAKE_GRAPH === 'true'
    ? new FakeCalendarClient([])
    : new GraphCalendarClient()

const calendarSourceSyncWorker = new Worker(
  'calendar-source-sync',
  async (job) => {
    const boardId = job.data?.boardId as string
    console.log(`Processing calendar-source-sync job for board ${boardId}`)
    return handleCalendarSourceSyncJob({ boardId }, db, makeCalendarClient())
  },
  { connection },
)
calendarSourceSyncWorker.on('failed', (job, err) =>
  console.error(`calendar-source-sync ${job?.id} failed: ${err.message}`),
)

// Self-heal: a sync killed mid-run (container restart / OOM / deploy) leaves its
// OrgTreeSource stuck at status 'syncing', which permanently disables the "Sync
// now" button in the Source tab. Reset any such orphaned row to 'error' with an
// actionable summary on boot. Only matches 'syncing' rows, so it's safe every boot.
try {
  await reconcileOrgSourceSync({ prisma: db, log: (message) => console.log(message) })
} catch (err) {
  console.error(
    `[org-source reconciler] failed: ${err instanceof Error ? err.message : String(err)}`,
  )
}

// ── Sync runs pruning ──────────────────────────────────────────────────────
// Delete sync_runs older than 7 days to prevent unbounded table growth.
async function pruneSyncRuns() {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await db.syncRun.deleteMany({
    where: { startedAt: { lt: threshold } },
  });
  if (result.count > 0) {
    console.log(`[Pruning] Deleted ${result.count} sync_runs older than 7 days`);
  }
}

// Prune on startup
await pruneSyncRuns();

// Schedule daily pruning
const pruneQueue = new Queue('sync-run-prune', { connection });
const pruneWorker = new Worker(
  'sync-run-prune',
  async () => { await pruneSyncRuns(); },
  { connection },
);
pruneWorker.on('failed', (_job, err) => {
  console.error(`Prune job failed: ${err.message}`);
});
try {
  await pruneQueue.add(
    'sync-run-prune',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: 'daily-prune' },
  );
} catch {
  console.debug('Prune repeatable job already exists (dedup applied)');
}

console.log('Worker ready')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing worker...')
  await worker.close()
  await queue.close()
  await adoWorker.close()
  await adoQueue.close()
  await ghWorker.close()
  await ghQueue.close()
  await pruneWorker.close()
  await pruneQueue.close()
  await orgSourceSyncWorker.close()
  await calendarSourceSyncWorker.close()
  await db.$disconnect()
  process.exit(0)
})