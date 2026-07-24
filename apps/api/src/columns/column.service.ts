import type { PrismaClient } from "@deckgauge/db";
import type {
  BoardColumn,
  CreateColumnInput,
  UpdateColumnInput,
  FieldValue,
  UpsertFieldValueInput,
} from "@deckgauge/shared";

export class ColumnService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByBoard(boardId: string): Promise<BoardColumn[]> {
    const rows = await this.prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
    });
    return rows as BoardColumn[];
  }

  async create(boardId: string, input: CreateColumnInput): Promise<BoardColumn> {
    const existing = await this.prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { order: "desc" },
      take: 1,
    });
    const nextOrder = existing.length > 0 ? existing[0]!.order + 1 : 0;

    const row = await this.prisma.boardColumn.create({
      data: {
        boardId,
        name: input.name,
        type: input.type,
        order: nextOrder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(input.config !== undefined && { config: input.config as unknown as any }),
      },
    });
    return row as BoardColumn;
  }

  async update(
    columnId: string,
    input: UpdateColumnInput,
  ): Promise<BoardColumn | null> {
    const existing = await this.prisma.boardColumn.findUnique({
      where: { id: columnId },
    });
    if (!existing) return null;

    const row = await this.prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.order !== undefined && { order: input.order }),
      },
    });
    return row as BoardColumn;
  }

  async delete(columnId: string): Promise<boolean> {
    const existing = await this.prisma.boardColumn.findUnique({
      where: { id: columnId },
    });
    if (!existing) return false;

    await this.prisma.boardColumn.delete({
      where: { id: columnId },
    });
    return true;
  }

  async upsertFieldValues(
    projectId: string,
    inputs: UpsertFieldValueInput[],
  ): Promise<FieldValue[] | null> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) return null;

    const results = await this.prisma.$transaction(async (tx) => {
      return Promise.all(
        inputs.map((input) =>
          tx.projectFieldValue.upsert({
            where: {
              projectId_columnId: { projectId, columnId: input.columnId },
            },
            create: {
              projectId,
              columnId: input.columnId,
              value: input.value,
            },
            update: { value: input.value },
          }),
        ),
      );
    });

    return results as FieldValue[];
  }

  async getFieldValues(projectId: string): Promise<FieldValue[]> {
    const rows = await this.prisma.projectFieldValue.findMany({
      where: { projectId },
    });
    return rows as FieldValue[];
  }
}
