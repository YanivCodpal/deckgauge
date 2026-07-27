import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { Queue } from 'bullmq';
import { z } from 'zod';
import {
  CreateGitHubInstanceInputSchema,
  UpdateGitHubInstanceInputSchema,
  GitHubProjectsAuthError,
} from '@deckgauge/shared';
import { GitHubService } from './github.service.js';

export async function githubRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new GitHubService(prisma);

  // GET /github/instances — list (tokens masked)
  app.get('/github/instances', async (_req, reply) => {
    const instances = await service.listInstances();
    return reply.send(instances);
  });

  // POST /github/instances — create
  app.post('/github/instances', async (req, reply) => {
    const parsed = CreateGitHubInstanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const instance = await service.createInstance(parsed.data);
    return reply.status(201).send(instance);
  });

  // PATCH /github/instances/:id — replace the access token, and/or update the repos list
  app.patch<{ Params: { id: string } }>('/github/instances/:id', async (req, reply) => {
    const parsed = UpdateGitHubInstanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { repos, accessToken, baseUrl } = parsed.data;
    // Token replacement takes precedence — the recovery path for an expired PAT.
    if (accessToken !== undefined) {
      const instance = await service.updateInstanceToken(req.params.id, { accessToken, baseUrl });
      if (!instance) return reply.status(404).send({ error: 'Instance not found' });
      return reply.send(instance);
    }
    if (repos === undefined) {
      return reply.status(400).send({ error: 'repos or accessToken field is required' });
    }
    const instance = await service.updateInstanceRepos(req.params.id, repos);
    if (!instance) return reply.status(404).send({ error: 'Instance not found' });
    return reply.send(instance);
  });

  // DELETE /github/instances/:id
  app.delete<{ Params: { id: string } }>('/github/instances/:id', async (req, reply) => {
    const deleted = await service.deleteInstance(req.params.id);
    if (!deleted) return reply.status(404).send({ error: 'Instance not found' });
    return reply.status(204).send();
  });

  // POST /github/instances/:id/test — test PAT
  app.post<{ Params: { id: string } }>('/github/instances/:id/test', async (req, reply) => {
    const instance = await service.getRawInstanceById(req.params.id);
    if (!instance) return reply.status(404).send({ error: 'Instance not found' });

    const result = await service.testConnection(req.params.id);
    if (!result.ok) {
      return reply.status(422).send(result);
    }
    return reply.send(result);
  });

  // POST /github/instances/:id/refresh-token — validate a new PAT, swap on success
  app.post<{ Params: { id: string } }>('/github/instances/:id/refresh-token', async (req, reply) => {
    const body = z.object({ token: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const result = await service.refreshToken(req.params.id, body.data.token);
    if (result.notFound) return reply.status(404).send({ error: 'Instance not found' });
    if (!result.ok) return reply.status(422).send({ ok: false, error: result.error });
    return reply.send({ ok: true });
  });

  // POST /github/instances/:id/repos — discover accessible repos for the PAT
  app.post<{ Params: { id: string } }>('/github/instances/:id/repos', async (req, reply) => {
    const instance = await service.getRawInstanceById(req.params.id);
    if (!instance) return reply.status(404).send({ error: 'Instance not found' });

    try {
      const repos = await service.discoverRepos(req.params.id);
      return reply.send({ repos });
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (err instanceof Error) message = err.message;
      return reply.status(422).send({ error: message });
    }
  });

  // GET /github/instances/:id/projects — list accessible GitHub Projects v2
  app.get<{ Params: { id: string } }>(
    '/github/instances/:id/projects',
    async (request, reply) => {
      try {
        const projects = await service.listProjectsForInstance(request.params.id);
        return projects;
      } catch (err) {
        if (err instanceof GitHubProjectsAuthError) {
          reply.code(502);
          return { error: 'GitHub token lacks read:project scope. Regenerate it with that scope.' };
        }
        if (err instanceof Error && /not found/i.test(err.message)) {
          reply.code(404);
          return { error: err.message };
        }
        throw err;
      }
    },
  );

  // GET /github/sync/status
  app.get('/github/sync/status', async (_req, reply) => {
    const result = await service.getLastSyncRun();
    if (!result) {
      return reply.send({ status: 'NEVER', finishedAt: null });
    }
    return reply.send(result);
  });

  // POST /github/sync — enqueue full sync, returns 202
  app.post('/github/sync', async (_req, reply) => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const queue = new Queue('github-sync', { connection: { url: redisUrl } });
    try {
      await queue.add('sync', { trigger: 'manual' });
      return reply.status(202).send({ ok: true, message: 'GitHub sync job enqueued' });
    } finally {
      await queue.close();
    }
  });

}
