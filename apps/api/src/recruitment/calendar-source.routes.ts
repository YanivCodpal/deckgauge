import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { SaveCalendarSourceConnectionSchema } from '@deckgauge/shared';
import { CalendarSourceService } from './calendar-source.service.js';

/** Requires the caller to have at least EDITOR access on the board. */
async function requireBoardEditor(
  req: FastifyRequest,
  reply: FastifyReply,
  prisma: PrismaClient,
  boardId: string,
): Promise<boolean> {
  const userId = req.user?.id;
  if (!userId) {
    reply.status(401).send({ error: 'Auth required' });
    return false;
  }
  const access = await prisma.boardAccess.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (!access || access.role === 'VIEWER') {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export interface CalendarSourceRoutesDeps {
  prisma: PrismaClient;
  /**
   * Enqueue a calendar→candidate ingest job for the board. Injected (mirrors the
   * org-source enqueue) so the api boots without Redis in unit-test contexts; throws
   * when the queue is unavailable, which the sync route surfaces as a 503.
   */
  enqueueCalendarSync?: (boardId: string) => Promise<void>;
}

export async function calendarSourceRoutes(
  app: FastifyInstance,
  { prisma, enqueueCalendarSync }: CalendarSourceRoutesDeps,
) {
  const service = new CalendarSourceService(prisma);

  // GET the current calendar-source connection state (never exposes the token).
  app.get<{ Params: { boardId: string } }>(
    '/boards/:boardId/calendar-source',
    async (req, reply) => {
      const { boardId } = req.params;
      if (!(await requireBoardEditor(req, reply, prisma, boardId))) return;
      return service.getConfig(boardId);
    },
  );

  // Persist a Microsoft Graph calendar connection. Written server-to-server by the
  // web layer (a pasted access token, or a delegated refresh token, plus the calendar
  // owner's UPN) — tokens never transit back to the browser.
  app.post<{ Params: { boardId: string } }>(
    '/boards/:boardId/calendar-source/connection',
    async (req, reply) => {
      const { boardId } = req.params;
      if (!(await requireBoardEditor(req, reply, prisma, boardId))) return;
      const body = SaveCalendarSourceConnectionSchema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
      return service.saveConnection(boardId, {
        accessToken: body.data.accessToken ?? null,
        refreshToken: body.data.refreshToken ?? null,
        calendarUpn: body.data.calendarUpn ?? null,
        connectedByEmail: body.data.connectedByEmail ?? null,
      });
    },
  );

  // Disconnect: drop the stored token + connection metadata.
  app.delete<{ Params: { boardId: string } }>(
    '/boards/:boardId/calendar-source/connection',
    async (req, reply) => {
      const { boardId } = req.params;
      if (!(await requireBoardEditor(req, reply, prisma, boardId))) return;
      const result = await service.clearConnection(boardId);
      if (!result) return reply.status(404).send({ error: 'not found' });
      return result;
    },
  );

  // Enqueue a calendar→candidate ingest job, then flip the source to 'syncing'.
  // Mirrors POST /org-trees/:id/source/sync: enqueue first (so a queue outage is a 503,
  // not a stuck 'syncing' status), then markSyncing for the UI.
  app.post<{ Params: { boardId: string } }>(
    '/boards/:boardId/calendar-source/sync',
    async (req, reply) => {
      const { boardId } = req.params;
      if (!(await requireBoardEditor(req, reply, prisma, boardId))) return;
      const existing = await service.getConfig(boardId);
      if (!existing) return reply.status(404).send({ error: 'not found' });
      try {
        if (!enqueueCalendarSync) throw new Error('calendar sync queue unavailable');
        await enqueueCalendarSync(boardId);
        await service.markSyncing(boardId);
      } catch {
        return reply.status(503).send({ error: 'calendar sync queue unavailable' });
      }
      return reply.status(202).send({ enqueued: true });
    },
  );
}
