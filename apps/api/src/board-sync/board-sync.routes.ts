import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@deckgauge/db';
import { BoardSyncService } from './board-sync.service.js';
import { requireBoardAccess } from '../board-access/board-access.middleware.js';
import type { IntelligenceQueues } from '../intelligence/queues.js';

interface Deps {
  prisma: PrismaClient;
  queues: IntelligenceQueues | null;
}

export function boardSyncRoutes(deps: Deps) {
  return async function plugin(app: FastifyInstance) {
    const ParamsSchema = z.object({ boardId: z.string().uuid() });

    app.post<{ Params: { boardId: string } }>(
      '/boards/:boardId/sync',
      { preHandler: requireBoardAccess(deps.prisma, 'EDITOR') },
      async (req, reply) => {
        const params = ParamsSchema.safeParse(req.params);
        if (!params.success) return reply.code(400).send({ error: params.error.flatten() });

        if (!deps.queues) {
          return reply.code(503).send({ error: 'sync queue not configured' });
        }

        const service = new BoardSyncService(deps.prisma, deps.queues);
        const enqueued = await service.enqueueBoardSync(params.data.boardId);
        return reply.code(202).send({ boardId: params.data.boardId, enqueued });
      },
    );

    app.get<{ Params: { boardId: string } }>(
      '/boards/:boardId/sync/status',
      { preHandler: requireBoardAccess(deps.prisma, 'VIEWER') },
      async (req, reply) => {
        const params = ParamsSchema.safeParse(req.params);
        if (!params.success) return reply.code(400).send({ error: params.error.flatten() });

        // Queues not needed for status — pass a no-op stub when unavailable, since
        // BoardSyncService.getBoardSyncStatus only reads Prisma, not BullMQ.
        const service = new BoardSyncService(
          deps.prisma,
          (deps.queues ?? {
            jira: { add: async () => {} },
            github: { add: async () => {} },
            ado: { add: async () => {} },
            gitlab: { add: async () => {} },
          }) as never,
        );
        const status = await service.getBoardSyncStatus(params.data.boardId);
        return reply.code(200).send(status);
      },
    );
  };
}
