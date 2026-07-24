import type { PrismaClient } from '@deckgauge/db';
import type { Octokit } from '@octokit/rest';
import type { PickerResponse } from '@deckgauge/shared';
import { matchesGlob } from './github-glob.js';

const PAGE_SIZE = 50;

export interface ListReposArgs {
  prisma: PrismaClient;
  octokit: Octokit;
  boardId: string;
  instanceId: string;
  org: string;
  pattern: string;
  page: number;
  includeArchived: boolean;
}

interface OrgRepo {
  full_name: string;
  name: string;
  archived: boolean;
  default_branch: string;
  language: string | null;
  topics?: string[];
  pushed_at: string | null;
  open_issues_count: number;
}

export async function listRepos(args: ListReposArgs): Promise<PickerResponse> {
  const all = (await args.octokit.paginate('GET /orgs/{org}/repos', {
    org: args.org,
    per_page: 100,
    type: 'all',
  } as never)) as OrgRepo[];

  const sources = (await args.prisma.boardGitHubSource.findMany({
    where: { boardId: args.boardId },
    select: { gitHubRepoSync: { select: { repoFullName: true, disabledAt: true } } },
  })) as Array<{ gitHubRepoSync: { repoFullName: string; disabledAt: Date | null } }>;

  const enabledFullNames = new Set(
    sources
      .filter((s) => s.gitHubRepoSync.disabledAt === null)
      .map((s) => s.gitHubRepoSync.repoFullName),
  );

  const filtered = all
    .filter((r) => args.includeArchived || !r.archived)
    .filter((r) => matchesGlob(r.name, args.pattern));

  const pageItems = filtered.slice((args.page - 1) * PAGE_SIZE, args.page * PAGE_SIZE);
  const nextPage = filtered.length > args.page * PAGE_SIZE ? args.page + 1 : null;

  return {
    repos: pageItems.map((r) => ({
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      language: r.language ?? null,
      topics: r.topics ?? [],
      archived: r.archived,
      lastPushedAt: r.pushed_at,
      openIssuesCount: r.open_issues_count ?? 0,
      enabled: enabledFullNames.has(r.full_name),
    })),
    totalMatched: filtered.length,
    nextPage,
  };
}
