import type { PrismaClient } from '@deckgauge/db';

const DEFAULT_GROUP_COLOR = '#6C6CFF';

/**
 * Ensure a board has a group with the given name, returning its id. Used by
 * sync promote services as a fallback when their config has no targetGroupId,
 * so synced items always land in a visible group instead of being orphaned.
 */
export async function ensureDefaultGroup(
  prisma: PrismaClient,
  boardId: string,
  name: string,
): Promise<string> {
  const existing = await prisma.group.findFirst({
    where: { boardId, name },
  });
  if (existing) return existing.id;

  const maxPos = await prisma.group.aggregate({
    where: { boardId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  try {
    const created = await prisma.group.create({
      data: {
        boardId,
        name,
        position,
        color: DEFAULT_GROUP_COLOR,
      },
    });
    return created.id;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const retry = await prisma.group.findFirst({
        where: { boardId, name },
      });
      if (retry) return retry.id;
    }
    throw err;
  }
}
