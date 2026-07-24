import type { PrismaClient } from '@deckgauge/db';

export interface BoardReverseIndex {
  lookup(kind: 'gh' | 'ado' | 'jira', key: string): string[];
  boardNames: Record<string, string>;
}

export async function buildBoardReverseIndex(prisma: PrismaClient): Promise<BoardReverseIndex> {
  const [boards, gh, ado, jira] = await Promise.all([
    prisma.board.findMany({ select: { id: true, name: true } }),
    prisma.boardGitHubSource.findMany({
      where: { useForIntelligence: true },
      include: { gitHubRepoSync: true },
    }),
    prisma.boardAdoSource.findMany({
      where: { useForIntelligence: true },
      include: { azureDevOpsProjectSync: true },
    }),
    prisma.boardJiraSource.findMany({ include: { jiraProjectSync: true } }),
  ]);

  const boardNames: Record<string, string> = Object.fromEntries(
    boards.map((b) => [b.id, b.name]),
  );

  const map = new Map<string, Set<string>>();

  const add = (kind: string, key: string, boardId: string): void => {
    const k = `${kind}|${key}`;
    if (!map.has(k)) map.set(k, new Set());
    map.get(k)!.add(boardId);
  };

  for (const s of gh) add('gh', s.gitHubRepoSync.repoFullName, s.boardId);
  for (const s of ado) add('ado', s.azureDevOpsProjectSync.adoProject, s.boardId);
  for (const s of jira) add('jira', s.jiraProjectSync.jiraProjectKey, s.boardId);

  return {
    boardNames,
    lookup: (kind, key) => [...(map.get(`${kind}|${key}`) ?? [])],
  };
}
