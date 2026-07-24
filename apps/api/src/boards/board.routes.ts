import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  BoardService,
  CreateBoardInputSchema,
  UpdateBoardInputSchema,
} from './board.service.js';
import type { PrismaClient } from '@deckgauge/db';
import { HiddenSystemFieldsSchema, ColumnLayoutSchema } from '@deckgauge/shared';

async function requireRole(
  req: FastifyRequest,
  reply: FastifyReply,
  prisma: PrismaClient,
  boardId: string,
  minRole: 'VIEWER' | 'EDITOR' | 'OWNER',
): Promise<boolean> {
  const userId = req.user?.id;
  if (!userId) {
    reply.status(401).send({ error: 'Auth required' });
    return false;
  }
  const access = await prisma.boardAccess.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (!access) {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  const rank = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const;
  if (rank[access.role] < rank[minRole]) {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function boardRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new BoardService(prisma);

  // GET /boards — returns only boards the user has access to (empty if unauthenticated)
  app.get('/boards', async (req, reply) => {
    const userId = req.user?.id;
    if (!userId) return reply.send([]);
    const boards = await service.list(userId);
    return reply.send(boards);
  });

  // GET /boards/:id — returns 404 if board doesn't exist or user has no access
  app.get<{ Params: { id: string } }>(
    '/boards/:id',
    async (req, reply) => {
      const userId = req.user?.id;
      if (!userId) return reply.status(404).send({ error: 'Not found' });
      const board = await service.getById(req.params.id, userId);
      if (!board) return reply.status(404).send({ error: 'Not found' });
      return reply.send(board);
    },
  );

  // POST /boards — must be authenticated; otherwise the board would be created
  // without an OWNER access entry and become orphaned (invisible to everyone).
  app.post('/boards', async (req, reply) => {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const parsed = CreateBoardInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const board = await service.create(parsed.data, userId);
    return reply.status(201).send(board);
  });

  // PATCH /boards/:id
  app.patch<{ Params: { id: string } }>(
    '/boards/:id',
    async (req, reply) => {
      const parsed = UpdateBoardInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const board = await service.update(req.params.id, parsed.data);
      if (!board) return reply.status(404).send({ error: 'Not found' });
      return reply.send(board);
    },
  );

  // DELETE /boards/:id
  app.delete<{ Params: { id: string } }>(
    '/boards/:id',
    async (req, reply) => {
      try {
        const deleted = await service.delete(req.params.id);
        if (!deleted) return reply.status(404).send({ error: 'Not found' });
        return reply.status(204).send();
      } catch (err) {
        req.log.error(err, 'Failed to delete board');
        return reply.status(500).send({ error: 'Failed to delete board' });
      }
    },
  );

  // PATCH /boards/:boardId/hidden-system-fields — EDITOR role required
  app.patch<{ Params: { boardId: string }; Body: { hiddenSystemFields: string[] } }>(
    '/boards/:boardId/hidden-system-fields',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'EDITOR');
      if (!ok) return;
      const existing = await prisma.board.findUnique({ where: { id: req.params.boardId } });
      if (!existing) return reply.status(404).send({ error: 'Not found' });
      const parsed = HiddenSystemFieldsSchema.safeParse(req.body?.hiddenSystemFields);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const board = await service.setHiddenSystemFields(req.params.boardId, parsed.data);
      return reply.send({ board });
    },
  );

  // PATCH /boards/:boardId/column-layout — EDITOR role required
  app.patch<{ Params: { boardId: string }; Body: unknown }>(
    '/boards/:boardId/column-layout',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'EDITOR');
      if (!ok) return;
      const existing = await prisma.board.findUnique({ where: { id: req.params.boardId } });
      if (!existing) return reply.status(404).send({ error: 'Not found' });
      const parsed = ColumnLayoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const board = await service.setColumnLayout(req.params.boardId, parsed.data);
      return reply.send({ board });
    },
  );
}
