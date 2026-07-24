import type { PrismaClient } from '@deckgauge/db';

export interface ComparisonMemberEntry {
  boardId: string;
  boardName: string;
  position: number;
}

// Persists the board set for a Comparison via the comparison_members join table
// (mirrors RoadmapBoardSubscription). The comparison widgets fan the existing
// single-board builders out across this set — see WidgetDataService.
export class ComparisonMembersService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(comparisonId: string): Promise<ComparisonMemberEntry[]> {
    const members = await this.prisma.comparisonMember.findMany({
      where: { comparisonId },
      orderBy: { position: 'asc' },
      select: { boardId: true, position: true, board: { select: { name: true } } },
    });
    return members.map((m) => ({
      boardId: m.boardId,
      boardName: m.board?.name ?? m.boardId,
      position: m.position,
    }));
  }

  // Replaces the full member set in one transaction: the picker sends the whole
  // ordered board list, so a clear-and-recreate keeps positions dense and the
  // stored order matching what the user sees. Duplicate ids collapse to the
  // first occurrence.
  async replace(comparisonId: string, boardIds: string[]): Promise<void> {
    const unique = boardIds.filter((id, i) => boardIds.indexOf(id) === i);
    await this.prisma.$transaction(async (tx) => {
      await tx.comparisonMember.deleteMany({ where: { comparisonId } });
      for (let position = 0; position < unique.length; position++) {
        const boardId = unique[position]!;
        await tx.comparisonMember.create({
          data: { comparisonId, boardId, position },
        });
      }
    });
  }
}
