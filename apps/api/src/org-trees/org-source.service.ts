import type { PrismaClient } from '@deckgauge/db';
import type { OrgSourceConfig, OrgSourceSyncSummaryT } from '@deckgauge/shared';

export class OrgSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  private toDto(row: {
    orgTreeId: string;
    provider: string;
    rootUpn: string;
    status: string;
    lastSyncedAt: Date | null;
    lastSyncSummary: unknown;
    msAccessToken: string | null;
    msRefreshToken: string | null;
    microsoftUpn: string | null;
    connectedByEmail: string | null;
    connectedAt: Date | null;
  }): OrgSourceConfig {
    return {
      orgTreeId: row.orgTreeId,
      provider: row.provider,
      rootUpn: row.rootUpn,
      status: (row.status as OrgSourceConfig['status']) ?? 'idle',
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      lastSyncSummary: (row.lastSyncSummary as OrgSourceSyncSummaryT | null) ?? null,
      // Expose only whether a connection exists — never the token itself.
      connected: Boolean(row.msAccessToken || row.msRefreshToken),
      microsoftUpn: row.microsoftUpn ?? null,
      connectedByEmail: row.connectedByEmail ?? null,
      connectedAt: row.connectedAt ? row.connectedAt.toISOString() : null,
    };
  }

  async getConfig(orgTreeId: string): Promise<OrgSourceConfig | null> {
    const row = await this.prisma.orgTreeSource.findUnique({ where: { orgTreeId } });
    return row ? this.toDto(row) : null;
  }

  async saveConfig(orgTreeId: string, rootUpn: string): Promise<OrgSourceConfig> {
    const row = await this.prisma.orgTreeSource.upsert({
      where: { orgTreeId },
      create: { orgTreeId, rootUpn, provider: 'microsoft' },
      update: { rootUpn },
    });
    return this.toDto(row);
  }

  async markSyncing(orgTreeId: string): Promise<void> {
    await this.prisma.orgTreeSource.update({ where: { orgTreeId }, data: { status: 'syncing' } });
  }

  /**
   * Persist a Microsoft Graph connection (server-to-server). Stores a user-pasted
   * access token (paste-token flow) and/or a delegated refresh token; the two token
   * columns are set exactly to what's provided so a paste replaces a stale refresh
   * token and vice-versa. On a fresh create the root person is left empty ('') so the
   * user can connect first and choose the root after. Clears any prior 'error'.
   */
  async saveConnection(
    orgTreeId: string,
    input: {
      accessToken?: string | null;
      refreshToken?: string | null;
      microsoftUpn: string;
      connectedByEmail?: string | null;
    },
  ): Promise<OrgSourceConfig> {
    const connection = {
      msAccessToken: input.accessToken ?? null,
      msRefreshToken: input.refreshToken ?? null,
      microsoftUpn: input.microsoftUpn,
      connectedByEmail: input.connectedByEmail ?? null,
      connectedAt: new Date(),
      status: 'idle',
    };
    const row = await this.prisma.orgTreeSource.upsert({
      where: { orgTreeId },
      create: { orgTreeId, provider: 'microsoft', rootUpn: '', ...connection },
      update: connection,
    });
    return this.toDto(row);
  }

  /** Disconnect: drop the stored tokens + connection metadata, keep rootUpn/history. */
  async clearConnection(orgTreeId: string): Promise<OrgSourceConfig | null> {
    const existing = await this.prisma.orgTreeSource.findUnique({ where: { orgTreeId } });
    if (!existing) return null;
    const row = await this.prisma.orgTreeSource.update({
      where: { orgTreeId },
      data: {
        msAccessToken: null,
        msRefreshToken: null,
        microsoftUpn: null,
        connectedByEmail: null,
        connectedAt: null,
        status: 'idle',
      },
    });
    return this.toDto(row);
  }
}
