import type { PrismaClient } from '@deckgauge/db';

export interface ComparisonSummary {
  id: string;
  name: string;
  memberCount: number;
}

// CRUD for standalone Comparison entities. Comparisons are owned by their
// creator (createdBy); all reads/writes here are already scoped to a single
// user's comparisons by the routes.
export class ComparisonService {
  constructor(private readonly prisma: PrismaClient) {}

  async listForUser(userId: string): Promise<ComparisonSummary[]> {
    const rows = await this.prisma.comparison.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, memberCount: r._count.members }));
  }

  // Returns the comparison only if it belongs to the given user, else null —
  // the routes turn null into a 404 so ownership never leaks existence.
  async getForUser(id: string, userId: string): Promise<ComparisonSummary | null> {
    const row = await this.prisma.comparison.findFirst({
      where: { id, createdBy: userId },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    return row ? { id: row.id, name: row.name, memberCount: row._count.members } : null;
  }

  async create(userId: string, name: string): Promise<ComparisonSummary> {
    const row = await this.prisma.comparison.create({
      data: { name, createdBy: userId },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    return { id: row.id, name: row.name, memberCount: row._count.members };
  }

  // Rename scoped to the owner: updateMany returns count 0 (not an error) when
  // the id isn't the user's, so the route can 404 without a separate lookup.
  async rename(id: string, userId: string, name: string): Promise<boolean> {
    const res = await this.prisma.comparison.updateMany({
      where: { id, createdBy: userId },
      data: { name },
    });
    return res.count > 0;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await this.prisma.comparison.deleteMany({ where: { id, createdBy: userId } });
    return res.count > 0;
  }

  // Ownership guard for the member routes.
  async isOwner(id: string, userId: string): Promise<boolean> {
    const row = await this.prisma.comparison.findFirst({
      where: { id, createdBy: userId },
      select: { id: true },
    });
    return row !== null;
  }
}
