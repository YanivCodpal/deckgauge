// EI-015 — ADO intelligence sync (additive dual-write, Phase 3).
// Iterates azure_devops_project_syncs rows; for each picked sync_repos[] entry
// fetches PRs+reviews (when syncPrs=true) and commits (when syncCommits=true).
// Strict opt-in: nothing syncs unless syncAllRepos is true (pick every repo the
// project returns, incl. future repos) OR sync_repos[] lists explicit repo names.
//
// Each repo is fetched and persisted INDEPENDENTLY, with its own watermark
// (ado_repo_sync_states). A large project (e.g. Horus: 50+ repos, tens of
// thousands of PRs) used to fetch all repos under one try/catch and only
// advanced a single project-level watermark at the very end — so any transient
// `fetch failed` aborted the whole project, wrote nothing, and never advanced
// the watermark, leaving it re-fetching from scratch and never completing. Now a
// failing repo is isolated and retried in place next run while healthy repos
// make monotonic progress. Upstream fetches go through resilientFetchJson
// (per-attempt timeout covering the body read + bounded retry) so transient
// blips self-heal and a stalled response body can't hang the worker.
import { PrismaClient } from '@deckgauge/db';
import { resilientFetchJson, type AdoPrPort, type AdoCommitPort } from '@deckgauge/shared';

export interface AdoIntelligenceJobData {
  trigger: 'manual' | 'scheduled' | 'startup';
  instanceId?: string;
  projects?: string[];
}

export interface AdoFactoryConfig {
  orgUrl: string;
  authMethod: 'PAT' | 'BASIC';
  accessToken: string;
  username?: string;
  instanceId: string;
}

export type AdoPrFactory = (cfg: AdoFactoryConfig) => AdoPrPort;
export type AdoCommitFactory = (cfg: AdoFactoryConfig) => AdoCommitPort;

export interface ChClient {
  insertRows(table: string, rows: ReadonlyArray<Record<string, unknown>>): Promise<void>;
}

export interface AdoIntelligenceResult {
  instancesProcessed: number;
  projectsProcessed: number;
  reposProcessed: number;
  pullRequestsWritten: number;
  reviewsWritten: number;
  commitsWritten: number;
  errors: Array<{ instanceId: string; project: string; repo?: string; message: string }>;
}

interface RepoSummary { id: string; name: string; defaultBranch?: string }
interface RepoInfo { id: string; defaultBranch?: string }

// Commit sync only pulls branches with activity in this window (the default
// branch is always included). Keeps a 2,000+ branch repo from fetching every
// dead feature branch — and, on a first run with no watermark, bounds the
// commit backfill to a recent window instead of every branch's full history
// (which is unbounded and never completes inside the job lock on a large repo).
const ACTIVE_BRANCH_DAYS = 90;

async function listReposByName(cfg: AdoFactoryConfig, project: string): Promise<Map<string, RepoInfo>> {
  const orgUrl = cfg.orgUrl.replace(/\/+$/, '');
  const projectEnc = encodeURIComponent(project);
  const raw = cfg.authMethod === 'BASIC' ? `${cfg.username ?? ''}:${cfg.accessToken}` : `:${cfg.accessToken}`;
  const auth = `Basic ${Buffer.from(raw).toString('base64')}`;
  const r = await resilientFetchJson<{ value: RepoSummary[] }>(
    fetch,
    `${orgUrl}/${projectEnc}/_apis/git/repositories?api-version=7.1`,
    { headers: { Authorization: auth, Accept: 'application/json' } },
  );
  if (!r.ok || !r.data) throw new Error(`ADO ${r.status} listing repositories for ${project}`);
  return new Map(r.data.value.map((repo) => [repo.name, { id: repo.id, defaultBranch: repo.defaultBranch }]));
}

export async function handleAdoIntelligenceSync(
  job: AdoIntelligenceJobData,
  db: PrismaClient,
  prFactory: AdoPrFactory,
  commitFactory: AdoCommitFactory,
  ch: ChClient,
): Promise<AdoIntelligenceResult> {
  const result: AdoIntelligenceResult = {
    instancesProcessed: 0, projectsProcessed: 0, reposProcessed: 0,
    pullRequestsWritten: 0, reviewsWritten: 0, commitsWritten: 0, errors: [],
  };
  const where: Record<string, unknown> = {};
  if (job.instanceId) where.id = job.instanceId;
  const instances = await db.azureDevOpsInstance.findMany({ where, include: { projectSyncs: true } });

  for (const instance of instances) {
    result.instancesProcessed++;
    const factoryCfg: AdoFactoryConfig = {
      orgUrl: instance.orgUrl,
      authMethod: instance.authMethod === 'BASIC' ? 'BASIC' : 'PAT',
      accessToken: instance.accessToken,
      username: instance.username ?? undefined,
      instanceId: instance.id,
    };
    const prAdapter = prFactory(factoryCfg);
    const commitAdapter = commitFactory(factoryCfg);
    const projects = job.projects ?? instance.projectSyncs.map((ps) => ps.adoProject);

    // Build a per-project prefix union from all boards that consume this
    // project with useForIntelligence=true. See github-intelligence-sync.handler
    // for the rationale — same shape, scoped on adoProject instead of repo.
    const boardSources = await db.boardAdoSource.findMany({
      where: {
        useForIntelligence: true,
        azureDevOpsProjectSync: { azureDevOpsInstanceId: instance.id, adoProject: { in: projects } },
      },
      select: {
        board: { select: { ticketKeyPrefixes: true } },
        azureDevOpsProjectSync: { select: { adoProject: true } },
      },
    });
    const projectToPrefixes = new Map<string, string[]>();
    for (const src of boardSources) {
      const proj = src.azureDevOpsProjectSync.adoProject;
      const existing = projectToPrefixes.get(proj) ?? [];
      projectToPrefixes.set(proj, Array.from(new Set([...existing, ...src.board.ticketKeyPrefixes])));
    }

    for (const project of projects) {
      try {
        const sync = instance.projectSyncs.find((ps) => ps.adoProject === project);
        if (!sync) continue;
        // strict opt-in: nothing syncs unless all-repos mode is on OR an explicit list is set
        if (!sync.syncAllRepos && (!sync.syncRepos || sync.syncRepos.length === 0)) {
          result.projectsProcessed++; continue;
        }
        if (!sync.syncPrs && !sync.syncCommits) { result.projectsProcessed++; continue; }

        const reposByName = await listReposByName(factoryCfg, project);
        const pickedRepos = sync.syncAllRepos
          ? Array.from(reposByName.entries()).map(([name, info]) => ({
              name,
              id: info.id,
              defaultBranch: info.defaultBranch,
            }))
          : sync.syncRepos
              .map((name) => ({ name, info: reposByName.get(name) }))
              .filter((r): r is { name: string; info: RepoInfo } => Boolean(r.info))
              .map((r) => ({ name: r.name, id: r.info.id, defaultBranch: r.info.defaultBranch }));

        if (pickedRepos.length === 0) {
          result.errors.push({
            instanceId: instance.id,
            project,
            message: sync.syncAllRepos
              ? `syncAllRepos set but project has no repositories: ${project}`
              : `None of sync_repos matched repos in project: ${sync.syncRepos.join(', ')}`,
          });
          continue;
        }

        const ticketPrefixes = projectToPrefixes.get(project) ?? [];
        // Active-branch cutoff for commit sync — bounds dead-branch and
        // first-run (no watermark) backfill. See ACTIVE_BRANCH_DAYS.
        const activeSince = new Date(Date.now() - ACTIVE_BRANCH_DAYS * 24 * 60 * 60 * 1000);

        // Per-repo watermark: each repo advances its own PR/commit cursor so the
        // whole project never re-fetches from scratch and a failed repo doesn't
        // hold back the rest.
        const states = await db.adoRepoSyncState.findMany({
          where: { azureDevOpsProjectSyncId: sync.id },
        });
        const stateByRepoId = new Map(states.map((s) => [s.repoId, s]));

        for (const repo of pickedRepos) {
          try {
            const st = stateByRepoId.get(repo.id);
            // Stamp the watermark from BEFORE the fetch so items created mid-fetch
            // are caught next run rather than skipped.
            const repoStart = new Date();
            let repoPrs = 0;
            let repoReviews = 0;
            let repoCommits = 0;
            console.log(`[ADO intel] ${project}/${repo.name}: fetching (prs=${sync.syncPrs} commits=${sync.syncCommits})`);

            if (sync.syncPrs) {
              const prSince = st?.lastPrSyncAt ?? undefined;
              const { pullRequests, reviews } = await prAdapter.fetchPullRequests({
                project,
                repoIds: [repo.id],
                since: prSince,
                ticketPrefixes,
              });
              if (pullRequests.length > 0) {
                await ch.insertRows('ado_pull_requests', pullRequests as unknown as Array<Record<string, unknown>>);
                result.pullRequestsWritten += pullRequests.length;
                repoPrs = pullRequests.length;
              }
              if (reviews.length > 0) {
                await ch.insertRows('ado_reviews', reviews as unknown as Array<Record<string, unknown>>);
                result.reviewsWritten += reviews.length;
                repoReviews = reviews.length;
              }
            }

            if (sync.syncCommits) {
              const commitSince = st?.lastCommitSyncAt ?? undefined;
              const commitRows = await commitAdapter.fetchCommits({
                project,
                repoId: repo.id,
                repoName: repo.name,
                since: commitSince,
                ticketPrefixes,
                defaultBranch: repo.defaultBranch,
                activeSince,
              });
              if (commitRows.length > 0) {
                await ch.insertRows('ado_commits', commitRows as unknown as Array<Record<string, unknown>>);
                result.commitsWritten += commitRows.length;
                repoCommits = commitRows.length;
              }
            }

            // Advance only the cursors this run actually covered; leave the other
            // null so a later flag flip backfills it from the beginning.
            await db.adoRepoSyncState.upsert({
              where: {
                azureDevOpsProjectSyncId_repoId: {
                  azureDevOpsProjectSyncId: sync.id,
                  repoId: repo.id,
                },
              },
              create: {
                azureDevOpsProjectSyncId: sync.id,
                repoId: repo.id,
                repoName: repo.name,
                lastPrSyncAt: sync.syncPrs ? repoStart : null,
                lastCommitSyncAt: sync.syncCommits ? repoStart : null,
              },
              update: {
                repoName: repo.name,
                ...(sync.syncPrs ? { lastPrSyncAt: repoStart } : {}),
                ...(sync.syncCommits ? { lastCommitSyncAt: repoStart } : {}),
              },
            });
            result.reposProcessed++;
            console.log(
              `[ADO intel] ${project}/${repo.name}: done (prs=${repoPrs} reviews=${repoReviews} commits=${repoCommits})`,
            );
          } catch (err) {
            // Isolate the failure to this repo; its watermark is untouched so it
            // retries from the same position next run.
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[ADO intel] ${project}/${repo.name}: FAILED — ${message}`);
            result.errors.push({
              instanceId: instance.id,
              project,
              repo: repo.name,
              message,
            });
          }
        }

        await db.azureDevOpsProjectSync.update({ where: { id: sync.id }, data: { lastSyncedAt: new Date() } });
        result.projectsProcessed++;
      } catch (err) {
        result.errors.push({ instanceId: instance.id, project, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return result;
}
