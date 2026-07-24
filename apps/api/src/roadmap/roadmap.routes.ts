import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { UpdateRoadmapConfigInputSchema, SetScheduleInputSchema } from '@deckgauge/shared';
import { RoadmapService } from './roadmap.service.js';
import { RoadmapConfigService } from './roadmap-config.service.js';

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

export async function roadmapRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
): Promise<void> {
  const roadmap = new RoadmapService(prisma);
  const configService = new RoadmapConfigService(prisma);

  // GET /api/boards/:boardId/roadmap?viewId=...
  app.get<{ Params: { boardId: string }; Querystring: { viewId: string } }>(
    '/boards/:boardId/roadmap',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'VIEWER');
      if (!ok) return;
      try {
        const payload = await roadmap.loadView(req.params.boardId, req.query.viewId);
        return reply.send(payload);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'VIEW_NOT_FOUND') {
          return reply.status(404).send({ error: 'View not found' });
        }
        throw e;
      }
    },
  );

  // PATCH /api/boards/:boardId/projects/:projectId/roadmap-schedule
  app.patch<{ Params: { boardId: string; projectId: string } }>(
    '/boards/:boardId/projects/:projectId/roadmap-schedule',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'EDITOR');
      if (!ok) return;
      const parsed = SetScheduleInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      try {
        const project = await roadmap.setSchedule(
          req.params.boardId,
          req.params.projectId,
          parsed.data,
        );
        return reply.send({ project });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'PROJECT_NOT_FOUND') {
          return reply.status(404).send({ error: 'Project not found' });
        }
        throw e;
      }
    },
  );

  // GET /api/boards/:boardId/views/:viewId/roadmap-config
  app.get<{ Params: { boardId: string; viewId: string } }>(
    '/boards/:boardId/views/:viewId/roadmap-config',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'VIEWER');
      if (!ok) return;
      try {
        const config = await configService.getOrCreate(req.params.viewId);
        return reply.send({ config });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'VIEW_NOT_FOUND') {
          return reply.status(404).send({ error: 'View not found' });
        }
        throw e;
      }
    },
  );

  // PATCH /api/boards/:boardId/views/:viewId/roadmap-config
  app.patch<{ Params: { boardId: string; viewId: string } }>(
    '/boards/:boardId/views/:viewId/roadmap-config',
    async (req, reply) => {
      const ok = await requireRole(req, reply, prisma, req.params.boardId, 'EDITOR');
      if (!ok) return;
      const parsed = UpdateRoadmapConfigInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      try {
        const config = await configService.update(req.params.viewId, parsed.data);
        return reply.send({ config });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'VIEW_NOT_FOUND') {
          return reply.status(404).send({ error: 'View not found' });
        }
        throw e;
      }
    },
  );
}
