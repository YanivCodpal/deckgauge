import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdoProjectSyncService } from './ado-project-sync.service.js';
import type { PrismaClient } from '@deckgauge/db';

const AdoProjectSyncCreateSchema = z.object({
  azureDevOpsInstanceId: z.string().uuid(),
  adoProject: z.string().min(1),
  syncPrs: z.boolean().default(false),
  syncCommits: z.boolean().default(false),
  syncRepos: z.array(z.string()).default([]),
  syncAllRepos: z.boolean().default(false),
});

export function adoProjectSyncRoutes(deps: { prisma: PrismaClient }) {
  const service = new AdoProjectSyncService(deps.prisma);
  return async function plugin(app: FastifyInstance) {
    app.get('/project-syncs/ado', async () => service.list());

    app.post('/project-syncs/ado', async (req, reply) => {
      const body = AdoProjectSyncCreateSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.create(body.data);
      return reply.code(201).send(row);
    });

    app.patch<{ Params: { id: string } }>('/project-syncs/ado/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const body = z
        .object({
          syncPrs: z.boolean().optional(),
          syncCommits: z.boolean().optional(),
          syncRepos: z.array(z.string()).optional(),
          syncAllRepos: z.boolean().optional(),
        })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.update(params.data.id, body.data);
    });

    app.delete<{ Params: { id: string } }>('/project-syncs/ado/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.delete(params.data.id);
      return reply.code(204).send();
    });

    app.post('/project-syncs/ado/ensure', async (req, reply) => {
      const body = z
        .object({ azureDevOpsInstanceId: z.string().uuid(), adoProject: z.string().min(1) })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.ensureSync(body.data.azureDevOpsInstanceId, body.data.adoProject);
      return reply.code(200).send(row);
    });
  };
}
