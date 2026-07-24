import type { PrismaClient, BoardStatus } from '@deckgauge/db';
import { CreateBoardStatusInputSchema, UpdateBoardStatusInputSchema, STATUS_COLORS } from '@deckgauge/shared';
import type { CreateBoardStatusInput, UpdateBoardStatusInput } from '@deckgauge/shared';

export class BoardStatusService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByBoard(boardId: string): Promise<BoardStatus[]> {
    return await this.prisma.boardStatus.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });
  }

  async getById(id: string): Promise<BoardStatus | null> {
    return await this.prisma.boardStatus.findUnique({ where: { id } });
  }

  async create(boardId: string, input: CreateBoardStatusInput): Promise<BoardStatus | null> {
    const validated = CreateBoardStatusInputSchema.parse(input);

    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return null;

    const existing = await this.prisma.boardStatus.findMany({
      where: { boardId },
    });

    const nextOrder = existing.length;

    let color = validated.color;
    if (!color) {
      const usedColors = new Set(existing.map((s: { color: string }) => s.color));
      const available = STATUS_COLORS.filter((c: string) => !usedColors.has(c));
      color = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]!
        : STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)]!;
    }

    return await this.prisma.boardStatus.create({
      data: {
        boardId,
        label: validated.label,
        color,
        ...(validated.icon !== undefined && { icon: validated.icon }),
        order: nextOrder,
      },
    });
  }

  async update(id: string, input: UpdateBoardStatusInput): Promise<BoardStatus | null> {
    const validated = UpdateBoardStatusInputSchema.parse(input);

    const existing = await this.prisma.boardStatus.findUnique({ where: { id } });
    if (!existing) return null;

    if (validated.isDefault === true) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.boardStatus.updateMany({
          where: { boardId: existing.boardId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        }),
        this.prisma.boardStatus.update({
          where: { id },
          data: {
            ...(validated.label !== undefined && { label: validated.label }),
            ...(validated.color !== undefined && { color: validated.color }),
            ...(validated.icon !== undefined && { icon: validated.icon }),
            ...(validated.order !== undefined && { order: validated.order }),
            isDefault: true,
          },
        }),
      ]);
      return updated;
    }

    const data: Record<string, unknown> = {};
    if (validated.label !== undefined) data.label = validated.label;
    if (validated.color !== undefined) data.color = validated.color;
    if (validated.icon !== undefined) data.icon = validated.icon;
    if (validated.order !== undefined) data.order = validated.order;
    if (validated.isDefault !== undefined) data.isDefault = validated.isDefault;

    return await this.prisma.boardStatus.update({ where: { id }, data });
  }

  async delete(
    id: string,
  ): Promise<{ deleted: true } | { deleted: false; reason: 'not_found' | 'sole_default' }> {
    const status = await this.prisma.boardStatus.findUnique({ where: { id } });
    if (!status) return { deleted: false, reason: 'not_found' };

    const otherStatuses = await this.prisma.boardStatus.findMany({
      where: { boardId: status.boardId, NOT: { id } },
      orderBy: { order: 'asc' },
    });

    // If this is the sole default and other statuses exist, reject
    if (status.isDefault && otherStatuses.length > 0) {
      const hasOtherDefault = otherStatuses.some((s) => s.isDefault);
      if (!hasOtherDefault) {
        // We'll promote the first remaining status to default, so proceed
      }
    }

    // If no other statuses exist, just delete
    if (otherStatuses.length === 0) {
      await this.prisma.boardStatus.delete({ where: { id } });
      return { deleted: true };
    }

    await this.prisma.$transaction(async (tx) => {
      const defaultStatus = status.isDefault
        ? otherStatuses[0]!
        : await tx.boardStatus.findFirst({
            where: { boardId: status.boardId, isDefault: true },
          });

      const reassignToId = defaultStatus?.id ?? otherStatuses[0]!.id;

      await tx.project.updateMany({
        where: { statusId: id },
        data: { statusId: reassignToId },
      });

      if (status.isDefault) {
        await tx.boardStatus.update({
          where: { id: otherStatuses[0]!.id },
          data: { isDefault: true },
        });
      }

      await tx.boardStatus.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
