import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { Queue } from 'bullmq';
import { z } from 'zod';
import {
  CreateAzureDevOpsInstanceInputSchema,
  UpdateAzureDevOpsInstanceInputSchema,
} from '@deckgauge/shared';
import { AzureDevOpsService } from './azure-devops.service.js';

export async function azureDevOpsRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new AzureDevOpsService(prisma);

  // GET /azure-devops/instances
  app.get('/azure-devops/instances', async (_req, reply) => {
    const instances = await service.listInstances();
    return reply.send(instances);
  });

  // POST /azure-devops/instances
  app.post('/azure-devops/instances', async (req, reply) => {
    const parsed = CreateAzureDevOpsInstanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const instance = await service.createInstance(parsed.data);
    return reply.status(201).send(instance);
  });

  // PATCH /azure-devops/instances/:id
  app.patch<{ Params: { id: string } }>('/azure-devops/instances/:id', async (req, reply) => {
    const parsed = UpdateAzureDevOpsInstanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const instance = await service.updateInstance(req.params.id, parsed.data);
    if (!instance) return reply.status(404).send({ error: 'Instance not found' });
    return reply.send(instance);
  });

  // DELETE /azure-devops/instances/:id
  app.delete<{ Params: { id: string } }>('/azure-devops/instances/:id', async (req, reply) => {
    const deleted = await service.deleteInstance(req.params.id);
    if (!deleted) return reply.status(404).send({ error: 'Instance not found' });
    return reply.status(204).send();
  });

  // POST /azure-devops/instances/:id/test — verify credentials
  app.post<{ Params: { id: string } }>(
    '/azure-devops/instances/:id/test',
    async (req, reply) => {
      const instance = await service.getRawInstanceById(req.params.id);
      if (!instance) return reply.status(404).send({ error: 'Instance not found' });

      try {
        const { AzureDevOpsRestAdapter } = await import('@deckgauge/shared');
        const adapter = new AzureDevOpsRestAdapter({
          orgUrl: instance.orgUrl,
          authMethod: instance.authMethod as 'PAT' | 'BASIC',
          accessToken: instance.accessToken,
          username: instance.username ?? undefined,
        });
        const project = instance.projects[0];
        if (project) {
          await adapter.fetchWorkItemTypes(project);
        } else {
          const url = `${instance.orgUrl}/_apis/projects?$top=1&api-version=7.0`;
          const authHeader =
            instance.authMethod === 'PAT'
              ? `Basic ${Buffer.from(`:${instance.accessToken}`).toString('base64')}`
              : `Basic ${Buffer.from(`${instance.username}:${instance.accessToken}`).toString('base64')}`;
          const res = await fetch(url, {
            headers: { Authorization: authHeader },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
        return reply.send({ ok: true });
      } catch (err: unknown) {
        let message = 'Connection failed';
        if (err instanceof Error) message = err.message;
        return reply.send({ ok: false, error: message });
      }
    },
  );

  // POST /azure-devops/instances/:id/refresh-token — swap stored credential
  app.post<{ Params: { id: string } }>(
    '/azure-devops/instances/:id/refresh-token',
    async (req, reply) => {
      const body = z.object({ token: z.string().min(1) }).safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
      const result = await service.refreshToken(req.params.id, body.data.token);
      if (result.notFound) return reply.status(404).send({ error: 'Instance not found' });
      if (!result.ok) return reply.status(422).send({ ok: false, error: result.error });
      return reply.send({ ok: true });
    },
  );

  // GET /azure-devops/sync/status
  app.get('/azure-devops/sync/status', async (_req, reply) => {
    const result = await service.getLastSyncRun();
    if (!result) {
      return reply.send({ status: 'NEVER', finishedAt: null });
    }
    return reply.send(result);
  });

  // POST /azure-devops/sync — enqueue manual sync
  app.post('/azure-devops/sync', async (_req, reply) => {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const queue = new Queue('azure-devops-sync', { connection: { url: redisUrl } });
    try {
      await queue.add('sync', { trigger: 'manual' });
      return reply.status(202).send({ ok: true, message: 'Azure DevOps sync job enqueued' });
    } finally {
      await queue.close();
    }
  });

  // GET /azure-devops/instances/:id/projects — list real team projects
  app.get<{ Params: { id: string } }>(
    '/azure-devops/instances/:id/projects',
    async (req, reply) => {
      const instance = await service.getRawInstanceById(req.params.id);
      if (!instance) return reply.status(404).send({ error: 'Instance not found' });

      try {
        const { AzureDevOpsRestAdapter } = await import('@deckgauge/shared');
        const adapter = new AzureDevOpsRestAdapter({
          orgUrl: instance.orgUrl,
          authMethod: instance.authMethod as 'PAT' | 'BASIC',
          accessToken: instance.accessToken,
          username: instance.username ?? undefined,
        });
        const projects = await adapter.listProjects();
        return reply.send({ projects });
      } catch (err: unknown) {
        let message = 'Unknown error';
        if (err instanceof Error) message = err.message;
        return reply.status(422).send({ error: message });
      }
    },
  );

  // GET /azure-devops/instances/:id/work-item-types?project=X
  app.get<{ Params: { id: string }; Querystring: { project?: string } }>(
    '/azure-devops/instances/:id/work-item-types',
    async (req, reply) => {
      const { project } = req.query;
      if (!project) {
        return reply.status(400).send({ error: 'project query param is required' });
      }

      const instance = await service.getRawInstanceById(req.params.id);
      if (!instance) return reply.status(404).send({ error: 'Instance not found' });

      try {
        const { AzureDevOpsRestAdapter } = await import('@deckgauge/shared');
        const adapter = new AzureDevOpsRestAdapter({
          orgUrl: instance.orgUrl,
          authMethod: instance.authMethod as 'PAT' | 'BASIC',
          accessToken: instance.accessToken,
          username: instance.username ?? undefined,
        });
        const types = await adapter.fetchWorkItemTypes(project);
        return reply.send({ types });
      } catch (err: unknown) {
        let message = 'Unknown error';
        if (err instanceof Error) message = err.message;
        return reply.status(422).send({ error: message });
      }
    },
  );
}
