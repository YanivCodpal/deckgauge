import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { JiraProjectSyncCreateSchema } from '@deckgauge/shared';
import { JiraProjectSyncService } from './jira-project-sync.service.js';
import type { PrismaClient } from '@deckgauge/db';

export function jiraProjectSyncRoutes(deps: { prisma: PrismaClient }) {
  const service = new JiraProjectSyncService(deps.prisma);
  return async function plugin(app: FastifyInstance) {
    app.get('/project-syncs/jira', async () => service.list());

    app.post('/project-syncs/jira', async (req, reply) => {
      const body = JiraProjectSyncCreateSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.create(body.data);
      return reply.code(201).send(row);
    });

    app.patch<{ Params: { id: string } }>('/project-syncs/jira/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const body = z.object({ syncChangelog: z.boolean().optional(), syncWorklogs: z.boolean().optional() }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.update(params.data.id, body.data);
    });

    app.delete<{ Params: { id: string } }>('/project-syncs/jira/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.delete(params.data.id);
      return reply.code(204).send();
    });

    app.post('/project-syncs/jira/ensure', async (req, reply) => {
      const body = z
        .object({ jiraInstanceId: z.string().uuid(), jiraProjectKey: z.string().min(1) })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.ensureSync(body.data.jiraInstanceId, body.data.jiraProjectKey);
      return reply.code(200).send(row);
    });
  };
}
