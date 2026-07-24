import { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { requireBoardAccess } from '../board-access/board-access.middleware.js';
import {
  DashboardWidgetService,
  CreateWidgetSchema,
  UpdateWidgetSchema,
  BulkLayoutSchema,
} from './dashboard-widgets.service.js';

export async function dashboardWidgetRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient }
) {
  const service = new DashboardWidgetService(prisma);

  // GET /boards/:boardId/views/:viewId/widgets
  app.get<{ Params: { boardId: string; viewId: string } }>(
    '/boards/:boardId/views/:viewId/widgets',
    async (req) => service.listByView(req.params.viewId)
  );

  // POST /boards/:boardId/views/:viewId/widgets
  app.post<{ Params: { boardId: string; viewId: string } }>(
    '/boards/:boardId/views/:viewId/widgets',
    { preHandler: [requireBoardAccess(prisma, 'EDITOR')] },
    async (req, reply) => {
      const parsed = CreateWidgetSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      const widget = await service.create(req.params.viewId, parsed.data);
      return reply.status(201).send(widget);
    }
  );

  // PATCH /boards/:boardId/views/:viewId/widgets/layout (bulk layout update)
  // IMPORTANT: Registered BEFORE the :widgetId route to avoid conflict
  app.patch<{ Params: { boardId: string; viewId: string } }>(
    '/boards/:boardId/views/:viewId/widgets/layout',
    { preHandler: [requireBoardAccess(prisma, 'EDITOR')] },
    async (req, reply) => {
      const parsed = BulkLayoutSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      await service.updateBulkLayout(parsed.data.layouts);
      return reply.send({ ok: true });
    }
  );

  // PATCH /boards/:boardId/views/:viewId/widgets/:widgetId
  app.patch<{ Params: { boardId: string; viewId: string; widgetId: string } }>(
    '/boards/:boardId/views/:viewId/widgets/:widgetId',
    { preHandler: [requireBoardAccess(prisma, 'EDITOR')] },
    async (req, reply) => {
      const parsed = UpdateWidgetSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return service.update(req.params.widgetId, parsed.data);
    }
  );

  // DELETE /boards/:boardId/views/:viewId/widgets/:widgetId
  app.delete<{ Params: { boardId: string; viewId: string; widgetId: string } }>(
    '/boards/:boardId/views/:viewId/widgets/:widgetId',
    { preHandler: [requireBoardAccess(prisma, 'OWNER')] },
    async (req, reply) => {
      const deleted = await service.delete(req.params.widgetId);
      if (!deleted) return reply.status(404).send({ error: 'Widget not found' });
      return reply.status(204).send();
    }
  );
}
