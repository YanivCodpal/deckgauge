// EI-030 — GitLab Fastify routes.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@deckgauge/db';
import { GitLabService, GitLabApiError } from './gitlab.service.js';

const CreateInstanceSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url().optional(),
  accessToken: z.string().min(1),
  projects: z.array(z.string()).default([]),
});

const CreateProjectSyncSchema = z.object({
  gitlabInstanceId: z.string().uuid(),
  projectPath: z.string().min(1),
  syncPrs: z.boolean().optional(),
  syncCommits: z.boolean().optional(),
});

export function gitlabRoutes({ prisma }: { prisma: PrismaClient }) {
  return async function plugin(app: FastifyInstance) {
    const service = new GitLabService(prisma);

    app.get('/gitlab/instances', async (_req, reply) => {
      const data = await service.listInstances();
      return reply.send(data);
    });

    app.post('/gitlab/instances', async (req, reply) => {
      const parsed = CreateInstanceSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      const data = await service.createInstance(parsed.data);
      return reply.code(201).send(data);
    });

    app.delete('/gitlab/instances/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.deleteInstance(params.data.id);
      return reply.code(204).send();
    });

    app.get('/gitlab/project-syncs', async (req, reply) => {
      const query = z.object({ instanceId: z.string().uuid().optional() }).safeParse(req.query);
      if (!query.success) return reply.code(400).send({ error: query.error.flatten() });
      const data = await service.listProjectSyncs(query.data.instanceId);
      return reply.send(data);
    });

    app.post('/gitlab/project-syncs', async (req, reply) => {
      const parsed = CreateProjectSyncSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      const data = await service.createProjectSync(parsed.data);
      return reply.code(201).send(data);
    });

    app.delete('/gitlab/project-syncs/:id', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.deleteProjectSync(params.data.id);
      return reply.code(204).send();
    });

    app.post('/gitlab/instances/:id/test', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const result = await service.testConnection(params.data.id);
      if (!result.ok) return reply.code(422).send(result);
      return reply.send(result);
    });

    app.post('/gitlab/instances/:id/refresh-token', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const body = z.object({ token: z.string().min(1) }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const result = await service.refreshToken(params.data.id, body.data.token);
      if (result.notFound) return reply.code(404).send({ error: 'Instance not found' });
      if (!result.ok) return reply.code(422).send({ ok: false, error: result.error });
      return reply.send({ ok: true });
    });

    app.get('/gitlab/instances/:id/projects', async (req, reply) => {
      const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      const query = z.object({ search: z.string().optional() }).safeParse(req.query);
      if (!query.success) return reply.code(400).send({ error: query.error.flatten() });
      try {
        const projects = await service.listRemoteProjects(params.data.id, query.data.search);
        return reply.send({ projects });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // Preserve 401/403 so the web layer can detect an expired/invalid token
        // and offer the reconnect flow; other upstream errors surface as 422.
        if (err instanceof GitLabApiError && (err.status === 401 || err.status === 403)) {
          return reply.code(err.status).send({ error: message });
        }
        if (/not found/i.test(message)) return reply.code(404).send({ error: message });
        return reply.code(422).send({ error: message });
      }
    });
  };
}
