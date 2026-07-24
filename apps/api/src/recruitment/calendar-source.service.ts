import type { PrismaClient } from '@deckgauge/db';
import type { BoardCalendarSourceConfig } from '@deckgauge/shared';

/**
 * Manages a recruitment board's Microsoft Graph calendar connection — the surface
 * the VP uses to paste a Graph token and name the calendar owner. Mirrors
 * OrgSourceService: it stores the token server-to-server and NEVER exposes it back
 * (the DTO carries only a `connected` boolean). The actual calendar→candidate ingest
 * worker is a separate later slice; `markSyncing` only flips the status.
 */
export class CalendarSourceService {
  constructor(private readonly prisma: PrismaClient) {}

  private toDto(row: {
    calendarUpn: string;
    status: string;
    lastSyncedAt: Date | null;
    lastSyncSummary?: unknown;
    msAccessToken: string | null;
    msRefreshToken: string | null;
    connectedByEmail: string | null;
    connectedAt: Date | null;
  }): BoardCalendarSourceConfig {
    // lastSyncSummary is stored as free-form JSON; a failed run records { error }.
    const summary =
      row.lastSyncSummary && typeof row.lastSyncSummary === 'object'
        ? (row.lastSyncSummary as { error?: unknown })
        : null;
    const lastError = typeof summary?.error === 'string' ? summary.error : null;
    return {
      calendarUpn: row.calendarUpn ?? '',
      status: row.status ?? 'idle',
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
      // Expose only whether a connection exists — never the token itself.
      connected: Boolean(row.msAccessToken || row.msRefreshToken),
      connectedByEmail: row.connectedByEmail ?? null,
      connectedAt: row.connectedAt ? row.connectedAt.toISOString() : null,
      lastError,
    };
  }

  async getConfig(boardId: string): Promise<BoardCalendarSourceConfig | null> {
    const row = await this.prisma.boardCalendarSource.findUnique({ where: { boardId } });
    return row ? this.toDto(row) : null;
  }

  async markSyncing(boardId: string): Promise<void> {
    await this.prisma.boardCalendarSource.update({
      where: { boardId },
      data: { status: 'syncing' },
    });
  }

  /**
   * Persist a Microsoft Graph calendar connection. Stores a user-pasted access token
   * and/or a delegated refresh token; the two token columns are set exactly to what's
   * provided so a paste replaces a stale refresh token and vice-versa. The calendar
   * UPN is updated only when provided. Clears any prior 'error' status.
   */
  async saveConnection(
    boardId: string,
    input: {
      accessToken?: string | null;
      refreshToken?: string | null;
      calendarUpn?: string | null;
      microsoftUpn?: string | null;
      connectedByEmail?: string | null;
    },
  ): Promise<BoardCalendarSourceConfig> {
    const connection = {
      msAccessToken: input.accessToken ?? null,
      msRefreshToken: input.refreshToken ?? null,
      microsoftUpn: input.microsoftUpn ?? null,
      connectedByEmail: input.connectedByEmail ?? null,
      connectedAt: new Date(),
      status: 'idle',
    };
    const upnField = input.calendarUpn != null ? { calendarUpn: input.calendarUpn } : {};
    const row = await this.prisma.boardCalendarSource.upsert({
      where: { boardId },
      create: {
        boardId,
        provider: 'microsoft',
        calendarUpn: input.calendarUpn ?? '',
        ...connection,
      },
      update: { ...connection, ...upnField },
    });
    return this.toDto(row);
  }

  /** Disconnect: drop the stored tokens + connection metadata, keep calendarUpn/history. */
  async clearConnection(boardId: string): Promise<BoardCalendarSourceConfig | null> {
    const existing = await this.prisma.boardCalendarSource.findUnique({ where: { boardId } });
    if (!existing) return null;
    const row = await this.prisma.boardCalendarSource.update({
      where: { boardId },
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
