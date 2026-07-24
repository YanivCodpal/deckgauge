// P1 — Board-scope helper.
// Aggregates the four Board*Source tables for a given board into a flat
// per-provider list of identifiers the ClickHouse queries use as WHERE-IN
// filters. A board with no sources connected yields isEmpty=true so callers
// can short-circuit and return an empty payload without issuing a query.
import type { PrismaClient } from '@deckgauge/db';

export interface BoardScope {
  /** Jira project keys (e.g. ['BWAY','DOS']) — filters jira_issues/transitions/worklogs */
  jiraProjectKeys: string[];
  /** GitHub repo full names (e.g. ['Acme/api']) — filters github_pull_requests/commits/reviews */
  githubRepoFullNames: string[];
  /** ADO projects (e.g. ['Acme/PaymentsService']) — filters ado_pull_requests/work_items */
  adoProjects: string[];
  /** GitLab project paths (e.g. ['Acme/api']) — filters gitlab_merge_requests/commits */
  gitlabProjectPaths: string[];
  /** True when no sources are connected for this board. */
  isEmpty: boolean;
}

const EMPTY_SCOPE: BoardScope = {
  jiraProjectKeys: [],
  githubRepoFullNames: [],
  adoProjects: [],
  gitlabProjectPaths: [],
  isEmpty: true,
};

export async function getBoardScope(
  prisma: PrismaClient,
  boardId: string,
): Promise<BoardScope> {
  const [jiraSources, githubSources, adoSources, gitlabSources] = await Promise.all([
    prisma.boardJiraSource.findMany({
      where: { boardId },
      include: { jiraProjectSync: true },
    }),
    prisma.boardGitHubSource.findMany({
      where: { boardId, useForIntelligence: true },
      include: { gitHubRepoSync: true },
    }),
    prisma.boardAdoSource.findMany({
      where: { boardId, useForIntelligence: true },
      include: { azureDevOpsProjectSync: true },
    }),
    prisma.boardGitLabSource.findMany({
      where: { boardId },
      include: { gitlabProjectSync: true },
    }),
  ]);

  const jiraProjectKeys = uniq(jiraSources.map((s) => s.jiraProjectSync.jiraProjectKey));
  const githubRepoFullNames = uniq(githubSources.map((s) => s.gitHubRepoSync.repoFullName));
  const adoProjects = uniq(adoSources.map((s) => s.azureDevOpsProjectSync.adoProject));
  const gitlabProjectPaths = uniq(gitlabSources.map((s) => s.gitlabProjectSync.projectPath));

  const isEmpty =
    jiraProjectKeys.length === 0 &&
    githubRepoFullNames.length === 0 &&
    adoProjects.length === 0 &&
    gitlabProjectPaths.length === 0;

  return { jiraProjectKeys, githubRepoFullNames, adoProjects, gitlabProjectPaths, isEmpty };
}

/** One board's resolved scope, tagged with its id + display name. */
export interface BoardScopeEntry {
  boardId: string;
  boardName: string;
  scope: BoardScope;
}

/**
 * Multi-board scope resolver for P6 comparison views. Resolves each board's
 * single-board scope (via {@link getBoardScope}) plus its display name, in
 * parallel, returning one entry per input board in the requested order.
 * No new SQL — this is a fan-out over the existing single-board path.
 */
export async function getBoardScopes(
  prisma: PrismaClient,
  boardIds: string[],
): Promise<BoardScopeEntry[]> {
  return Promise.all(
    boardIds.map(async (boardId) => {
      const [board, scope] = await Promise.all([
        prisma.board.findUnique({ where: { id: boardId }, select: { name: true } }),
        getBoardScope(prisma, boardId),
      ]);
      return { boardId, boardName: board?.name ?? boardId, scope };
    }),
  );
}

export function emptyBoardScope(): BoardScope {
  return { ...EMPTY_SCOPE };
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs));
}
