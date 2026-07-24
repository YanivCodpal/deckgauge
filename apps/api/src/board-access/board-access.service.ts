import type { PrismaClient, BoardAccess, BoardAccessRole } from '@deckgauge/db';

export class BoardAccessService {
  constructor(private readonly prisma: PrismaClient) {}

  async grantAccess(boardId: string, userId: string, role: BoardAccessRole): Promise<BoardAccess> {
    return this.prisma.boardAccess.create({
      data: { boardId, userId, role },
    });
  }

  async updateRole(
    boardId: string,
    userId: string,
    role: BoardAccessRole,
  ): Promise<BoardAccess | null> {
    const existing = await this.prisma.boardAccess.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!existing) return null;
    return this.prisma.boardAccess.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role },
    });
  }

  async revokeAccess(boardId: string, userId: string): Promise<void> {
    const access = await this.prisma.boardAccess.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!access) return;

    if (access.role === 'OWNER') {
      const ownerCount = await this.prisma.boardAccess.count({
        where: { boardId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last board owner');
      }
    }

    await this.prisma.boardAccess.delete({
      where: { boardId_userId: { boardId, userId } },
    });
  }

  async listAccess(boardId: string): Promise<BoardAccess[]> {
    return this.prisma.boardAccess.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            keycloakId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAccess(boardId: string, userId: string): Promise<BoardAccess | null> {
    return this.prisma.boardAccess.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
  }
}
