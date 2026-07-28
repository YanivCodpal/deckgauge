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
  /** Invoked once per page of merge requests; the caller persists the batch. */
  onMergeRequests: (rows: GitLabMergeRequestRow[]) => Promise<void>;
  /** Invoked once per page of commits (only when syncCommits is true). */
  onCommits: (rows: GitLabCommitRow[]) => Promise<void>;
}

export interface ProcessGitLabSyncResult {
  mergeRequestsWritten: number;
  commitsWritten: number;
}

// Streams MRs (always) and commits (when syncCommits) one page at a time,
// handing each page to the caller's persist callback. Streaming keeps the
// worker's memory flat regardless of repo size — the old buffer-everything
// path accumulated a whole project's history and OOM'd the 384MiB worker on
// first-time full backfills (mirrors the ADO promoteProjectStream pattern).
export async function processGitLabSync(
  opts: ProcessGitLabSyncOpts,
): Promise<ProcessGitLabSyncResult> {
  let mergeRequestsWritten = 0;
  let commitsWritten = 0;

  for await (const batch of opts.prAdapter.streamMergeRequests({
    projectPath: opts.projectPath,
    updatedAfter: opts.since,
    ticketPrefixes: opts.ticketPrefixes,
  })) {
    if (batch.length > 0) {
      await opts.onMergeRequests(batch);
      mergeRequestsWritten += batch.length;
    }
  }

  if (opts.syncCommits) {
    for await (const batch of opts.commitAdapter.streamCommits({
      projectPath: opts.projectPath,
      since: opts.since,
      ticketPrefixes: opts.ticketPrefixes,
    })) {
      if (batch.length > 0) {
        await opts.onCommits(batch);
        commitsWritten += batch.length;
      }
    }
  }

  return { mergeRequestsWritten, commitsWritten };
}
