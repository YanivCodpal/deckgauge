// EI-014 — gitlab-sync BullMQ job handler.
import { PrismaClient } from '@deckgauge/db';
import type {
  GitLabPrPort,
  GitLabCommitPort,
  GitLabMergeRequestRow,
  GitLabCommitRow,
} from '@deckgauge/shared';
import { processGitLabSync } from './gitlab-sync.processor.js';

export interface GitLabSyncJobData {
  trigger: 'manual' | 'scheduled' | 'startup';
  instanceId?: string;
  projectPaths?: string[];
}

export type GitLabPrAdapterFactory = (cfg: {
  accessToken: string;
  baseUrl?: string;
  instanceId: string;
}) => GitLabPrPort;

export type GitLabCommitAdapterFactory = (cfg: {
  accessToken: string;
  baseUrl?: string;
  instanceId: string;
}) => GitLabCommitPort;

export interface GitLabSyncResult {
  instancesProcessed: number;
  projectsProcessed: number;
  mergeRequestsWritten: number;
  commitsWritten: number;
  errors: Array<{ instanceId: string; projectPath: string; message: string }>;
}

export interface ChClient {
  insertRows(table: string, rows: ReadonlyArray<Record<string, unknown>>): Promise<void>;
}

export async function handleGitLabSyncJob(
  job: GitLabSyncJobData,
  db: PrismaClient,
  prAdapterFactory: GitLabPrAdapterFactory,
  commitAdapterFactory: GitLabCommitAdapterFactory,
  ch: ChClient,
): Promise<GitLabSyncResult> {
  const result: GitLabSyncResult = {
    instancesProcessed: 0,
    projectsProcessed: 0,
    mergeRequestsWritten: 0,
    commitsWritten: 0,
    errors: [],
  };

  const where: Record<string, unknown> = {};
  if (job.instanceId) where.gitlabInstanceId = job.instanceId;

  const projectSyncs = await db.gitLabProjectSync.findMany({
    where,
    include: { gitlabInstance: true },
  });

  const filtered = job.projectPaths
    ? projectSyncs.filter((ps) => job.projectPaths!.includes(ps.projectPath))
    : projectSyncs;

  const byInstance = new Map<string, typeof filtered>();
  for (const ps of filtered) {
    const list = byInstance.get(ps.gitlabInstanceId) ?? [];
    list.push(ps);
    byInstance.set(ps.gitlabInstanceId, list);
  }

  for (const [instanceId, syncs] of byInstance.entries()) {
    result.instancesProcessed++;
    const instance = syncs[0]!.gitlabInstance;
    const prAdapter = prAdapterFactory({
      accessToken: instance.accessToken,
      baseUrl: instance.baseUrl,
      instanceId,
    });
    const commitAdapter = commitAdapterFactory({
      accessToken: instance.accessToken,
      baseUrl: instance.baseUrl,
      instanceId,
    });

    for (const ps of syncs) {
      try {
        const sinceMrs = ps.lastSyncedAt ?? undefined;
        const { mergeRequests, commits } = await processGitLabSync({
          projectPath: ps.projectPath,
          since: sinceMrs,
          syncCommits: ps.syncCommits,
          prAdapter,
          commitAdapter,
        });

        if (mergeRequests.length > 0) {
          await ch.insertRows(
            'gitlab_merge_requests',
            mergeRequests as unknown as Array<Record<string, unknown>>,
          );
          result.mergeRequestsWritten += mergeRequests.length;
        }
        if (commits.length > 0) {
          await ch.insertRows(
            'gitlab_commits',
            commits as unknown as Array<Record<string, unknown>>,
          );
          result.commitsWritten += commits.length;
        }

        await db.gitLabProjectSync.update({
          where: { id: ps.id },
          data: { lastSyncedAt: new Date() },
        });
        result.projectsProcessed++;
      } catch (err) {
        result.errors.push({
          instanceId,
          projectPath: ps.projectPath,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}

export type { GitLabMergeRequestRow, GitLabCommitRow };
