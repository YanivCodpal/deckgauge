import type { PrismaClient, BoardOwner } from "@deckgauge/db";
import { CreateOwnerInputSchema, UpdateOwnerInputSchema, OWNER_COLORS } from "@deckgauge/shared";
import type { CreateOwnerInput, UpdateOwnerInput } from "@deckgauge/shared";

export class OwnerService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByBoard(boardId: string): Promise<BoardOwner[]> {
    return await this.prisma.boardOwner.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
    });
  }

  async getById(id: string): Promise<BoardOwner | null> {
    return await this.prisma.boardOwner.findUnique({ where: { id } });
  }

  async create(boardId: string, input: CreateOwnerInput): Promise<BoardOwner | null> {
    const validated = CreateOwnerInputSchema.parse(input);

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) return null;

    const existingOwners = await this.prisma.boardOwner.findMany({
      where: { boardId },
    });

    const order = existingOwners.length;

    const usedColors = new Set(existingOwners.map((o) => o.color));
    const unusedColors = OWNER_COLORS.filter((c) => !usedColors.has(c));
    const color =
      unusedColors.length > 0
        ? unusedColors[Math.floor(Math.random() * unusedColors.length)]!
        : OWNER_COLORS[Math.floor(Math.random() * OWNER_COLORS.length)]!;

    return await this.prisma.boardOwner.create({
      data: {
        name: validated.name,
        boardId,
        color,
        order,
      },
    });
  }

  async update(id: string, input: UpdateOwnerInput): Promise<BoardOwner | null> {
    const validated = UpdateOwnerInputSchema.parse(input);

    const existing = await this.prisma.boardOwner.findUnique({ where: { id } });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (validated.name !== undefined) data.name = validated.name;
    if (validated.color !== undefined) data.color = validated.color;
    if (validated.order !== undefined) data.order = validated.order;

    return await this.prisma.boardOwner.update({ where: { id }, data });
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const existing = await this.prisma.boardOwner.findUnique({ where: { id } });
    if (!existing) return { deleted: false };

    await this.prisma.boardOwner.delete({ where: { id } });
    return { deleted: true };
  }
}
