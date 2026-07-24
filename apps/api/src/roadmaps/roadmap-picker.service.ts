import type { PrismaClient } from '@deckgauge/db';

export class RoadmapPickerService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPickerBoards(userId: string) {
    const boards = await this.prisma.board.findMany({
      where: { accessEntries: { some: { userId } } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        groups: { orderBy: { position: 'asc' }, select: { id: true, name: true } },
      },
    });
    return boards;
  }
}
