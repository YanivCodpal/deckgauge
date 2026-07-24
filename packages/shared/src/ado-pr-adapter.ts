// EI-007 — AdoPrAdapter.
import { detectAiAssistance } from './ai-detection';
import { extractTicketKeys } from './ticket-link-extractor';
import { chDateTime, chDateTimeRequired } from './clickhouse-datetime';
import { resilientFetchJson } from './resilient-fetch';

export interface AdoPrFetchOpts {
  project: string;
  repoIds?: string[];
  since?: Date;
  ticketPrefixes?: string[];
  pageSize?: number;
  maxPages?: number;
}

export interface AdoPullRequestRow {
  id: string;
  pr_id: number;
  org_url: string;
  project: string;
  repo_name: string;
  title: string;
  description: string;
  status: string;
  is_draft: 0 | 1;
  source_branch: string;
  target_branch: string;
  labels: string[];
  created_by_login: string;
  created_by_name: string | null;
  reviewers: string[];
  additions: number;
  deletions: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  first_vote_at: string | null;
  cycle_time_hours: number | null;
  review_time_hours: number | null;
  ai_assisted: 0 | 1;
  ai_confidence: number | null;
  ai_signals: string;
  linked_ticket_keys: string[];
  instance_id: string;
}

export interface AdoReviewRow {
  id: string;
  org_url: string;
  project: string;
  repo_id: string;
  repo_name: string;
  pull_request_id: number;
  pr_author_login: string;
  reviewer_login: string;
  reviewer_name: string | null;
  vote: number;
  state: string;
  body: string;
  comment_count: number;
  submitted_at: string;
  instance_id: string;
}

export interface AdoPrFetchResult {
  pullRequests: AdoPullRequestRow[];
  reviews: AdoReviewRow[];
}

export interface AdoPrPort {
  fetchPullRequests(opts: AdoPrFetchOpts): Promise<AdoPrFetchResult>;
}

interface AdoPrAdapterConfig {
  orgUrl: string;
  authMethod: 'PAT' | 'BASIC';
  accessToken: string;
  username?: string;
  instanceId: string;
  fetchFn?: typeof fetch;
}

interface RawRepo {
  id: string;
  name: string;
}

interface RawIdentity {
  displayName: string;
  uniqueName?: string;
}

interface RawPr {
  pullRequestId: number;
  repository: RawRepo;
  title: string;
  description?: string;
  status: string;
  isDraft?: boolean;
  sourceRefName: string;
  targetRefName: string;
  creationDate: string;
  closedDate?: string;
  labels?: Array<{ name: string; active?: boolean }>;
  createdBy?: RawIdentity;
  reviewers?: Array<RawIdentity & { vote: number; votedFor?: Array<{ value: number; timestamp: string }> }>;
}

interface RawThreadProperty {
  $type?: string;
  $value?: string | number;
}

interface RawThread {
  publishedDate: string;
  isDeleted?: boolean;
  status?: string;
  comments?: Array<{ commentType?: string; publishedDate: string; author?: RawIdentity }>;
  properties?: Record<string, RawThreadProperty | undefined>;
}

// ADO exposes per-reviewer vote timestamps ONLY through system threads with
// properties.CodeReviewThreadType === 'VoteUpdate'. `reviewer.votedFor` is
// for delegated group votes (rare), so reading only that field misses
// reviews entirely. Returns the earliest vote thread's publishedDate.
function firstVoteAtFromThreads(threads: RawThread[]): string | null {
  const votes: string[] = [];
  for (const t of threads) {
    if (t.isDeleted) continue;
    const threadType = t.properties?.['CodeReviewThreadType']?.$value;
    if (threadType !== 'VoteUpdate') continue;
    if (typeof t.publishedDate === 'string') votes.push(t.publishedDate);
  }
  if (votes.length === 0) return null;
  return votes.sort()[0] ?? null;
}

function authHeader(cfg: AdoPrAdapterConfig): string {
  const raw = cfg.authMethod === 'BASIC' ? `${cfg.username ?? ''}:${cfg.accessToken}` : `:${cfg.accessToken}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

function hoursBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const t1 = Date.parse(a);
  const t2 = Date.parse(b);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Number(((t2 - t1) / 3_600_000).toFixed(2));
}

function branchName(ref: string): string {
  return ref.replace(/^refs\/heads\//, '');
}

function voteToState(vote: number): string {
  if (vote >= 10) return 'approved';
  if (vote >= 5) return 'approved-with-suggestions';
  if (vote <= -10) return 'rejected';
  if (vote <= -5) return 'waiting-for-author';
  return 'no-vote';
}

export class AdoPrAdapter implements AdoPrPort {
  private readonly cfg: AdoPrAdapterConfig;
  private readonly orgUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(cfg: AdoPrAdapterConfig) {
    this.cfg = cfg;
    this.orgUrl = cfg.orgUrl.replace(/\/+$/, '');
    this.doFetch = cfg.fetchFn ?? fetch;
  }

  async fetchPullRequests(opts: AdoPrFetchOpts): Promise<AdoPrFetchResult> {
    const pageSize = opts.pageSize ?? 100;
    const maxPages = opts.maxPages ?? 100;
    const prefixes = opts.ticketPrefixes ?? [];
    const projectEnc = encodeURIComponent(opts.project);

    let repoIds: string[];
    if (opts.repoIds === undefined) {
      const repos = await this.ado<{ value: RawRepo[] }>(
        `${this.orgUrl}/${projectEnc}/_apis/git/repositories?api-version=7.1`,
      );
      repoIds = repos.value.map((r) => r.id);
    } else if (opts.repoIds.length === 0) {
      return { pullRequests: [], reviews: [] };
    } else {
      repoIds = opts.repoIds;
    }

    const pullRequests: AdoPullRequestRow[] = [];
    const reviews: AdoReviewRow[] = [];
    for (const repoId of repoIds) {
      for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({
          'api-version': '7.1',
          'searchCriteria.status': 'all',
          'searchCriteria.repositoryId': repoId,
          $top: String(pageSize),
          $skip: String(page * pageSize),
        });
        if (opts.since) params.set('searchCriteria.minTime', opts.since.toISOString());
        const url = `${this.orgUrl}/${projectEnc}/_apis/git/pullrequests?${params.toString()}`;
        const list = await this.ado<{ value: RawPr[] }>(url);
        if (!list.value || list.value.length === 0) break;
        for (const pr of list.value) {
          const threads = await this.ado<{ value: RawThread[] }>(
            `${this.orgUrl}/${projectEnc}/_apis/git/repositories/${pr.repository.id}/pullRequests/${pr.pullRequestId}/threads?api-version=7.1`,
          );
          pullRequests.push(this.transform(opts.project, pr, threads.value, prefixes));
          for (const review of this.extractReviews(opts.project, pr, threads.value)) {
            reviews.push(review);
          }
        }
        if (list.value.length < pageSize) break;
      }
    }
    return { pullRequests, reviews };
  }

  private extractReviews(project: string, pr: RawPr, threads: RawThread[]): AdoReviewRow[] {
    if (!pr.reviewers || pr.reviewers.length === 0) return [];
    const author = pr.createdBy?.uniqueName ?? pr.createdBy?.displayName ?? 'unknown';
    const commentCountByAuthor = new Map<string, number>();
    for (const thread of threads) {
      if (thread.isDeleted) continue;
      for (const c of thread.comments ?? []) {
        if (c.commentType && c.commentType !== 'text') continue;
        const key = c.author?.uniqueName ?? c.author?.displayName ?? '';
        if (!key) continue;
        commentCountByAuthor.set(key, (commentCountByAuthor.get(key) ?? 0) + 1);
      }
    }
    const out: AdoReviewRow[] = [];
    for (const r of pr.reviewers) {
      const reviewerLogin = r.uniqueName ?? r.displayName;
      const votedAt = (r.votedFor ?? [])
        .map((v) => v.timestamp)
        .filter((t): t is string => typeof t === 'string')
        .sort()
        .slice(-1)[0];
      out.push({
        id: `${this.orgUrl}/${project}#${pr.pullRequestId}#${reviewerLogin}`,
        org_url: this.orgUrl,
        project,
        repo_id: pr.repository.id,
        repo_name: pr.repository.name,
        pull_request_id: pr.pullRequestId,
        pr_author_login: author,
        reviewer_login: reviewerLogin,
        reviewer_name: r.displayName ?? null,
        vote: r.vote,
        state: voteToState(r.vote),
        body: '',
        comment_count: commentCountByAuthor.get(reviewerLogin) ?? 0,
        submitted_at: chDateTimeRequired(votedAt ?? pr.creationDate),
        instance_id: this.cfg.instanceId,
      });
    }
    return out;
  }

  private async ado<T>(url: string): Promise<T> {
    const r = await resilientFetchJson<T>(this.doFetch, url, {
      headers: {
        Authorization: authHeader(this.cfg),
        Accept: 'application/json',
      },
    });
    if (!r.ok) throw new Error(`ADO ${r.status} ${r.statusText} for ${url}`);
    return r.data as T;
  }

  private transform(
    project: string,
    pr: RawPr,
    threads: RawThread[],
    prefixes: string[],
  ): AdoPullRequestRow {
    const isDraft: 0 | 1 = pr.isDraft ? 1 : 0;
    const updatedAt =
      threads
        .map((t) => t.publishedDate)
        .filter((d): d is string => typeof d === 'string')
        .sort()
        .slice(-1)[0] ?? pr.creationDate;

    const delegatedVoteAt =
      pr.reviewers
        ?.flatMap((r) => (r.votedFor ?? []).map((v) => v.timestamp))
        .filter((t): t is string => typeof t === 'string')
        .sort()[0] ?? null;
    const threadVoteAt = firstVoteAtFromThreads(threads);
    const candidates = [threadVoteAt, delegatedVoteAt].filter(
      (t): t is string => typeof t === 'string',
    );
    const firstVoteAt = candidates.length > 0 ? candidates.sort()[0]! : null;

    const cycle = pr.status === 'completed' ? hoursBetween(pr.creationDate, pr.closedDate ?? null) : null;
    const review = firstVoteAt ? hoursBetween(pr.creationDate, firstVoteAt) : null;

    const source = branchName(pr.sourceRefName);
    const target = branchName(pr.targetRefName);
    const author = pr.createdBy?.uniqueName ?? pr.createdBy?.displayName ?? 'unknown';

    const ai = detectAiAssistance({
      prTitle: pr.title,
      prBody: pr.description ?? '',
      branchName: source,
      authorLogin: author,
    });
    const linkedKeys = extractTicketKeys({
      text: `${pr.title}\n${pr.description ?? ''}`,
      branchName: source,
      prefixes,
      source: 'ado',
    });

    return {
      id: `${this.orgUrl}/${project}#${pr.pullRequestId}`,
      pr_id: pr.pullRequestId,
      org_url: this.orgUrl,
      project,
      repo_name: pr.repository.name,
      title: pr.title,
      description: pr.description ?? '',
      status: pr.status,
      is_draft: isDraft,
      source_branch: source,
      target_branch: target,
      labels: (pr.labels ?? []).filter((l) => l.active !== false).map((l) => l.name),
      created_by_login: author,
      created_by_name: pr.createdBy?.displayName ?? null,
      reviewers: (pr.reviewers ?? []).map((r) => r.uniqueName ?? r.displayName),
      additions: 0,
      deletions: 0,
      created_at: chDateTimeRequired(pr.creationDate),
      updated_at: chDateTimeRequired(updatedAt),
      closed_at: chDateTime(pr.closedDate ?? null),
      first_vote_at: chDateTime(firstVoteAt),
      cycle_time_hours: cycle,
      review_time_hours: review,
      ai_assisted: ai.aiAssisted ? 1 : 0,
      ai_confidence: ai.confidence,
      ai_signals: JSON.stringify(ai.signals),
      linked_ticket_keys: linkedKeys,
      instance_id: this.cfg.instanceId,
    };
  }
}

export class FakeAdoPrAdapter implements AdoPrPort {
  constructor(private readonly seed: AdoPullRequestRow[] | AdoPrFetchResult) {}
  async fetchPullRequests(_opts: AdoPrFetchOpts): Promise<AdoPrFetchResult> {
    if (Array.isArray(this.seed)) return { pullRequests: this.seed, reviews: [] };
    return this.seed;
  }
}
