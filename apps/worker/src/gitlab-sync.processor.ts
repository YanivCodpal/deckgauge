// EI-014 — pure processor body for one (instance × project) sync.
import type {
  GitLabPrPort,
  GitLabCommitPort,
  GitLabMergeRequestRow,
  GitLabCommitRow,
} from '@deckgauge/shared';

export interface ProcessGitLabSyncOpts {
  projectPath: string;
  since?: Date;
  syncCommits: boolean;
  ticketPrefixes?: string[];
  prAdapter: GitLabPrPort;
  commitAdapter: GitLabCommitPort;
}

export interface ProcessGitLabSyncResult {
  mergeRequests: GitLabMergeRequestRow[];
  commits: GitLabCommitRow[];
}

export async function processGitLabSync(
  opts: ProcessGitLabSyncOpts,
): Promise<ProcessGitLabSyncResult> {
  const mergeRequests = await opts.prAdapter.fetchMergeRequests({
    projectPath: opts.projectPath,
    updatedAfter: opts.since,
    ticketPrefixes: opts.ticketPrefixes,
  });

  let commits: GitLabCommitRow[] = [];
  if (opts.syncCommits) {
    commits = await opts.commitAdapter.fetchCommits({
      projectPath: opts.projectPath,
      since: opts.since,
      ticketPrefixes: opts.ticketPrefixes,
    });
  }

  return { mergeRequests, commits };
}
