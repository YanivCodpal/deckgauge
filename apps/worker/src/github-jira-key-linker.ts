import type { PrismaClient } from '@deckgauge/db';

export function buildJiraKeyRegex(projectKeys: string[]): RegExp {
  if (projectKeys.length === 0) return /(?!)/g;
  const escaped = projectKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})-\\d+\\b`, 'g');
}

export function extractKeys(text: string, regex: RegExp): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(regex)) seen.add(m[0]);
  return [...seen];
}

export interface PrForLinking {
  id: string;
  repo: string;
  title: string;
  mergedAt: Date | null;
  commits: Array<{ message: string }>;
}

export async function reconcilePrLinks(
  prisma: PrismaClient,
  regex: RegExp,
  pr: PrForLinking
): Promise<void> {
  const titleKeys = new Set(extractKeys(pr.title, regex));
  const commitKeys = new Set(pr.commits.flatMap((c) => extractKeys(c.message, regex)));

  const deleteTitle =
    titleKeys.size === 0
      ? prisma.prJiraLink.deleteMany({ where: { prId: pr.id, source: 'pr_title' } })
      : prisma.prJiraLink.deleteMany({
          where: { prId: pr.id, source: 'pr_title', jiraKey: { notIn: [...titleKeys] } },
        });
  const deleteCommit =
    commitKeys.size === 0
      ? prisma.prJiraLink.deleteMany({ where: { prId: pr.id, source: 'commit_message' } })
      : prisma.prJiraLink.deleteMany({
          where: { prId: pr.id, source: 'commit_message', jiraKey: { notIn: [...commitKeys] } },
        });

  await prisma.$transaction([
    deleteTitle,
    deleteCommit,
    ...[...titleKeys].map((key) =>
      prisma.prJiraLink.upsert({
        where: { prId_jiraKey_source: { prId: pr.id, jiraKey: key, source: 'pr_title' } },
        create: {
          prId: pr.id,
          repoFullName: pr.repo,
          jiraKey: key,
          source: 'pr_title',
          mergedAt: pr.mergedAt,
        },
        update: { mergedAt: pr.mergedAt },
      })
    ),
    ...[...commitKeys].map((key) =>
      prisma.prJiraLink.upsert({
        where: { prId_jiraKey_source: { prId: pr.id, jiraKey: key, source: 'commit_message' } },
        create: {
          prId: pr.id,
          repoFullName: pr.repo,
          jiraKey: key,
          source: 'commit_message',
          mergedAt: pr.mergedAt,
        },
        update: { mergedAt: pr.mergedAt },
      })
    ),
  ]);
}
