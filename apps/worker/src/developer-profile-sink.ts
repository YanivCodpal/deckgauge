// P8.5 — worker-side DeveloperProfile sink.
//
// Lives in apps/worker (not apps/api) because cross-app imports between
// sibling apps are forbidden by this monorepo's conventions. The companion
// PrismaDeveloperProfileService in apps/api/src/developer-profiles/ does the
// same upsert; we re-implement it here against the worker's PrismaClient to
// avoid an apps/api → apps/worker import edge.
import type { PrismaClient } from '@deckgauge/db';

export type DeveloperProfileProvider = 'github' | 'gitlab' | 'ado' | 'jira';

export interface DeveloperProfileUpsert {
  provider: DeveloperProfileProvider;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export interface DeveloperProfileSink {
  upsertOnSync(input: DeveloperProfileUpsert): Promise<{ id: string }>;
}

export class PrismaDeveloperProfileSink implements DeveloperProfileSink {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertOnSync(input: DeveloperProfileUpsert): Promise<{ id: string }> {
    return this.prisma.developerProfile.upsert({
      where: { provider_login: { provider: input.provider, login: input.login } },
      create: input,
      update: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        email: input.email,
      },
      select: { id: true },
    });
  }
}
