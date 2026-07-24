import type { PrismaClient } from '@deckgauge/db';

export interface ResolvedScope {
  github: string[];
  jira: string[];
  ado: string[];
  gitlab: string[];
}

export async function resolveScope(
  prisma: PrismaClient,
  boardId: string,
): Promise<ResolvedScope> {
  const [github, jira, ado, gitlab] = await Promise.all([
    prisma.boardGitHubSource.findMany({
      where: { boardId },
      select: { gitHubRepoSync: { select: { repoFullName: true } } },
    }),
    prisma.boardJiraSource.findMany({
      where: { boardId },
      select: { jiraProjectSync: { select: { jiraProjectKey: true } } },
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

  return {
    github: github.map((r) => r.gitHubRepoSync.repoFullName),
    jira: jira.map((r) => r.jiraProjectSync.jiraProjectKey),
    ado: ado.map((r) => r.azureDevOpsProjectSync.adoProject),
    gitlab: gitlab.map((r) => r.gitlabProjectSync.projectPath),
  };
}
