import type { PrismaClient } from '@deckgauge/db';
import type { DeveloperProvider, DeveloperProfileDto } from '@deckgauge/shared';

export interface DeveloperProfileUpsert {
  provider: DeveloperProvider;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export class DeveloperProfileService {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertOnSync(input: DeveloperProfileUpsert): Promise<{ id: string }> {
    return this.prisma.developerProfile.upsert({
      where: { provider_login: { provider: input.provider, login: input.login } },
      create: input,
      update: { displayName: input.displayName, avatarUrl: input.avatarUrl, email: input.email },
    });
  }

  async list(): Promise<DeveloperProfileDto[]> {
    const rows = await this.prisma.developerProfile.findMany({ orderBy: { login: 'asc' } });
    return rows.map((r) => ({
      id: r.id, provider: r.provider as DeveloperProvider, login: r.login,
      displayName: r.displayName, avatarUrl: r.avatarUrl, email: r.email, userId: r.userId,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async searchByLoginOrName(q: string): Promise<DeveloperProfileDto[]> {
    const rows = await this.prisma.developerProfile.findMany({
      where: {
        OR: [
          { login: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { login: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id, provider: r.provider as DeveloperProvider, login: r.login,
      displayName: r.displayName, avatarUrl: r.avatarUrl, email: r.email, userId: r.userId,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async findByLogin(provider: DeveloperProvider, login: string): Promise<DeveloperProfileDto | null> {
    const r = await this.prisma.developerProfile.findUnique({
      where: { provider_login: { provider, login } },
    });
    if (!r) return null;
    return {
      id: r.id, provider: r.provider as DeveloperProvider, login: r.login,
      displayName: r.displayName, avatarUrl: r.avatarUrl, email: r.email, userId: r.userId,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    };
  }

  async linkToUser(id: string, userId: string | null): Promise<void> {
    await this.prisma.developerProfile.update({ where: { id }, data: { userId } });
  }
}
