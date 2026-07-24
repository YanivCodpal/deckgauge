import type { PrismaClient } from '@deckgauge/db';
import { Prisma } from '@deckgauge/db';
import { EmployeeCommentSchema, type EmployeeComment } from '@deckgauge/shared';
import type { UploadService } from '../uploads/upload.service.js';

interface CreateInput {
  content: Prisma.InputJsonValue;
  authorName?: string;
  uploadIds?: string[];
}
interface UpdateInput {
  content?: Prisma.InputJsonValue;
  pinned?: boolean;
}

function mapToComment(raw: unknown): EmployeeComment {
  return EmployeeCommentSchema.parse(raw);
}

export class EmployeeCommentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly uploadService?: UploadService,
  ) {}

  async listByEmployee(orgEmployeeId: string): Promise<EmployeeComment[]> {
    const rows = await this.prisma.orgEmployeeComment.findMany({
      where: { orgEmployeeId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapToComment);
  }

  async create(orgEmployeeId: string, input: CreateInput): Promise<EmployeeComment> {
    const row = await this.prisma.orgEmployeeComment.create({
      data: { orgEmployeeId, content: input.content, authorName: input.authorName ?? 'VP' },
    });
    if (this.uploadService && input.uploadIds && input.uploadIds.length > 0) {
      await this.uploadService.linkToEmployeeComment(row.id, input.uploadIds);
    }
    return mapToComment(row);
  }

  async update(id: string, input: UpdateInput): Promise<EmployeeComment | null> {
    const existing = await this.prisma.orgEmployeeComment.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.orgEmployeeComment.update({
      where: { id },
      data: {
        ...(input.content !== undefined && { content: input.content }),
        ...(input.pinned !== undefined && { pinned: input.pinned }),
      },
    });
    return mapToComment(row);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.orgEmployeeComment.findUnique({ where: { id } });
    if (!existing) return false;
    if (this.uploadService) await this.uploadService.deleteForEmployeeComment(id);
    await this.prisma.orgEmployeeComment.delete({ where: { id } });
    return true;
  }

  async countByEmployee(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {};
    const groups = await this.prisma.orgEmployeeComment.groupBy({
      by: ['orgEmployeeId'],
      where: { orgEmployeeId: { in: ids } },
      _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const g of groups) result[g.orgEmployeeId] = g._count.id;
    return result;
  }
}
