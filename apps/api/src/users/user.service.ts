import type { PrismaClient, User } from '@deckgauge/db';

export interface UpsertInput {
  keycloakId: string;
  email: string | undefined;
  name: string | undefined;
}

export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertFromKeycloak(input: UpsertInput): Promise<User> {
    const email = input.email ?? `${input.keycloakId}@keycloak.local`;
    const name = input.name ?? 'Unknown';
    return this.prisma.user.upsert({
      where: { keycloakId: input.keycloakId },
      create: { keycloakId: input.keycloakId, email, name },
      update: { email, name },
    });
  }

  async search(query: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}
