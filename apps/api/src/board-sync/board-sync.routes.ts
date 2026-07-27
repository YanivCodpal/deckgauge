import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@deckgauge/db';
import { BoardSyncService } from './board-sync.service.js';
import { BoardSourceHealthService, type BoardSourceProbes } from './board-source-health.service.js';
import { requireBoardAccess } from '../board-access/board-access.middleware.js';
import type { IntelligenceQueues } from '../intelligence/queues.js';
import { JiraInstanceService } from '../jira-instances/jira-instance.service.js';
import { GitHubService } from '../github/github.service.js';
import { GitLabService } from '../gitlab/gitlab.service.js';
import { AzureDevOpsService } from '../azure-devops/azure-devops.service.js';

interface Deps {
  prisma: PrismaClient;
  queues: IntelligenceQueues | null;
  healthServiceFactory?: () => BoardSourceHealthService;
}

export function boardSyncRoutes(deps: Deps) {
  return async function plugin(app: FastifyInstance) {
    const ParamsSchema = z.object({ boardId: z.string().uuid() });

    const buildHealthService = () => {
      if (deps.healthServiceFactory) return deps.healthServiceFactory();
      const jira = new JiraInstanceService(deps.prisma);
      const github = new GitHubService(deps.prisma);
      const gitlab = new GitLabService(deps.prisma);
      const ado = new AzureDevOpsService(deps.prisma);
      const probes: BoardSourceProbes = {
        jira: (id) => jira.testConnection(id),
        github: (id) => github.testConnection(id),
        gitlab: (id) => gitlab.testConnection(id),
        ado: (id) => ado.testConnection(id),
      };
      return new BoardSourceHealthService(deps.prisma, probes);
    };

    app.post<{ Params: { boardId: string } }>(
      '/boards/:boardId/sync',
      { preHandler: requireBoardAccess(deps.prisma, 'EDITOR') },
      async (req, reply) => {
        const params = ParamsSchema.safeParse(req.params);
        if (!params.success) return reply.code(400).send({ error: params.error.flatten() });

        if (!deps.queues) {
          return reply.code(503).send({ error: 'sync queue not configured' });
        }

        const health = await buildHealthService().probe(params.data.boardId);
        const expired = health.sources.filter((s) => s.state === 'expired');
        const skip = new Set(expired.map((s) => s.instanceId));
        const service = new BoardSyncService(deps.prisma, deps.queues);
        const enqueued = await service.enqueueBoardSync(params.data.boardId, skip);
        return reply.code(202).send({
          boardId: params.data.boardId,
          enqueued,
          expired,
        });
      },
    );

    app.get<{ Params: { boardId: string } }>(
      '/boards/:boardId/sync/health',
      { preHandler: requireBoardAccess(deps.prisma, 'VIEWER') },
      async (req, reply) => {
        const params = ParamsSchema.safeParse(req.params);
        if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
        const health = await buildHealthService().probe(params.data.boardId);
        return reply.code(200).send(health);
      },
    );

    app.get<{ Params: { boardId: string } }>(
      '/boards/:boardId/sync/status',
      { preHandler: requireBoardAccess(deps.prisma, 'VIEWER') },
      async (req, reply) => {
        const params = ParamsSchema.safeParse(req.params);
        if (!params.success) return reply.code(400).send({ error: params.error.flatten() });

        // Queues not needed for status — pass a no-op stub when unavailable, since
        // BoardSyncService.getBoardSyncStatus only reads Prisma, not BullMQ.
        const service = new BoardSyncService(
          deps.prisma,
          (deps.queues ?? {
            jira: { add: async () => {} },
            github: { add: async () => {} },
            ado: { add: async () => {} },
            gitlab: { add: async () => {} },
          }) as never,
        );
        const status = await service.getBoardSyncStatus(params.data.boardId);
        return reply.code(200).send(status);
      },
    );
  };
}
