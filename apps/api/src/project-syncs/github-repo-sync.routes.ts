import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GitHubRepoSyncService } from './github-repo-sync.service.js';
import type { PrismaClient } from '@deckgauge/db';

// Per Task 16: syncPrs/syncCommits flags were removed. The new bulk-repo
// ingestion always syncs PRs, reviews, commits, workflow runs, deployments,
// and issues per repo; cadence is governed by tier.
const GitHubRepoSyncCreateSchema = z.object({
  githubInstanceId: z.string().uuid(),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
});

export function githubRepoSyncRoutes(deps: { prisma: PrismaClient }) {
  const service = new GitHubRepoSyncService(deps.prisma);
  return async function plugin(app: FastifyInstance) {
    app.get('/project-syncs/github', async () => service.list());

    app.post('/project-syncs/github', async (req, reply) => {
      const body = GitHubRepoSyncCreateSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.create(body.data);
      return reply.code(201).send(row);
    });

    app.delete<{ Params: { id: string } }>('/project-syncs/github/:id', async (req, reply) => {
      // GitHubRepoSync.id is a cuid (Prisma default), not a uuid — never
      // validate it with z.string().uuid() or every delete 400s.
      const params = z.object({ id: z.string().min(1) }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
      await service.delete(params.data.id);
      return reply.code(204).send();
    });

    app.post('/project-syncs/github/ensure', async (req, reply) => {
      const body = z
        .object({ githubInstanceId: z.string().uuid(), repoFullName: z.string().min(1) })
        .safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const row = await service.ensureSync(body.data.githubInstanceId, body.data.repoFullName);
      return reply.code(200).send(row);
    });
  };
}
