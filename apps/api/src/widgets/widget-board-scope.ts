// Widget-side board-scope resolver. Returns the external project / repo
// identifiers that ClickHouse rows are tagged with, so we can filter
// board-scoped widget queries against the global ClickHouse store.
//
// P1 owns a parallel helper under `apps/api/src/intelligence/board-scope.ts`.
// We keep ours separate (different path + namespace) to avoid merge conflicts.

import type { PrismaClient } from '@deckgauge/db';

export interface WidgetBoardScope {
  jiraProjectKeys: string[];
  githubRepoFullNames: string[];
  adoProjects: string[];
  gitlabProjectPaths: string[];
  isEmpty: boolean;
}

export async function getWidgetBoardScope(
  prisma: PrismaClient,
  boardId: string
): Promise<WidgetBoardScope> {
  const [jiraSources, githubSources, adoSources, gitlabSources] = await Promise.all([
    prisma.boardJiraSource.findMany({
      where: { boardId },
      select: { jiraProjectSync: { select: { jiraProjectKey: true } } },
    }),
    prisma.boardGitHubSource.findMany({
      where: { boardId },
      select: { gitHubRepoSync: { select: { repoFullName: true } } },
    }),
    prisma.boardAdoSource.findMany({
      where: { boardId },
      select: { azureDevOpsProjectSync: { select: { adoProject: true } } },
    }),
    prisma.boardGitLabSource.findMany({
      where: { boardId },
      select: { gitlabProjectSync: { select: { projectPath: true } } },
    }),
  ]);

  const jiraProjectKeys = jiraSources
    .map((s) => s.jiraProjectSync?.jiraProjectKey)
    .filter((v): v is string => Boolean(v));
  const githubRepoFullNames = githubSources
    .map((s) => s.gitHubRepoSync?.repoFullName)
    .filter((v): v is string => Boolean(v));
  const adoProjects = adoSources
    .map((s) => s.azureDevOpsProjectSync?.adoProject)
    .filter((v): v is string => Boolean(v));
  const gitlabProjectPaths = gitlabSources
    .map((s) => s.gitlabProjectSync?.projectPath)
    .filter((v): v is string => Boolean(v));

  const isEmpty =
    jiraProjectKeys.length === 0 &&
    githubRepoFullNames.length === 0 &&
    adoProjects.length === 0 &&
    gitlabProjectPaths.length === 0;

  return {
    jiraProjectKeys,
    githubRepoFullNames,
    adoProjects,
    gitlabProjectPaths,
    isEmpty,
  };
}
