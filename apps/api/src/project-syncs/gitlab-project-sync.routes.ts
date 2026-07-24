import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GitLabProjectSyncService } from './gitlab-project-sync.service.js';
import type { PrismaClient } from '@deckgauge/db';

const GitLabProjectSyncCreateSchema = z.object({
  gitlabInstanceId: z.string().uuid(),
  projectPath: z.string().min(1),
  syncPrs: z.boolean().default(true),
  syncCommits: z.boolean().default(false),
});

export function gitlabProjectSyncRoutes(deps: { prisma: PrismaClient }) {
  const service = new GitLabProjectSyncService(deps.prisma);
  return async function plugin(app: FastifyInstance) {
    app.get('/project-syncs/gitlab', async () => service.list());

    app.post('/project-syncs/gitlab', async (req, reply) => {
      const body = GitLabProjectSyncCreateSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.create(body.data);
      return reply.code(201).send(row);
    });

    app.patch<{ Params: { id: string } }>('/project-syncs/gitlab/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const body = z
        .object({ syncPrs: z.boolean().optional(), syncCommits: z.boolean().optional() })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.update(params.data.id, body.data);
    });

    app.delete<{ Params: { id: string } }>('/project-syncs/gitlab/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.delete(params.data.id);
      return reply.code(204).send();
    });

    app.post('/project-syncs/gitlab/ensure', async (req, reply) => {
      const body = z
        .object({ gitlabInstanceId: z.string().uuid(), projectPath: z.string().min(1) })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.ensureSync(body.data.gitlabInstanceId, body.data.projectPath);
      return reply.code(200).send(row);
    });
  };
}
