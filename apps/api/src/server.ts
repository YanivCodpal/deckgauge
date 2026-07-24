import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, clickhouse } from "@deckgauge/db";
import { ClickhouseIntelligenceService } from "./intelligence/clickhouse-intelligence.service.js";
import { intelligenceRoutes } from "./intelligence/intelligence.routes.js";
import { buildIntelligenceQueues } from "./intelligence/queues.js";
import { boardRoutes } from "./boards/board.routes.js";
import { recruitmentRoutes } from "./recruitment/recruitment.routes.js";
import { calendarSourceRoutes } from "./recruitment/calendar-source.routes.js";
import { projectRoutes } from "./projects/project.routes.js";
import { groupRoutes } from "./groups/group.routes.js";
import { columnRoutes } from "./columns/column.routes.js";
import { automationRoutes } from "./automations/automation.routes.js";
import { jiraInstanceRoutes } from "./jira-instances/jira-instance.routes.js";
import { commentRoutes } from "./comments/comment.routes.js";
import { ownerRoutes } from "./owners/owner.routes.js";
import { boardStatusRoutes } from "./board-statuses/board-status.routes.js";
import { uploadRoutes } from "./uploads/upload.routes.js";
import { UploadService } from "./uploads/upload.service.js";
import { githubRoutes } from "./github/github.routes.js";
import { azureDevOpsRoutes } from "./azure-devops/azure-devops.routes.js";
import { adoProjectSyncRoutes } from "./project-syncs/ado-project-sync.routes.js";
import { gitlabRoutes } from "./gitlab/gitlab.routes.js";
import { developerProfileRoutes } from "./developer-profiles/developer-profile.routes.js";
import { jiraProjectSyncRoutes } from "./project-syncs/jira-project-sync.routes.js";
import { githubRepoSyncRoutes } from "./project-syncs/github-repo-sync.routes.js";
import { gitlabProjectSyncRoutes } from "./project-syncs/gitlab-project-sync.routes.js";
import { boardJiraSourceRoutes } from "./board-sources/board-jira-source.routes.js";
import { boardGitHubSourceRoutes } from "./board-sources/board-github-source.routes.js";
import { boardGitHubPickerRoutes } from "./board-sources/board-github-picker.routes.js";
import { Octokit } from "@octokit/rest";
import { Queue } from "bullmq";
import {
  GITHUB_SYNC_QUEUE_NAMES,
  makeGitHubQueueClient,
} from "@deckgauge/shared";
import { boardAdoSourceRoutes } from "./board-sources/board-ado-source.routes.js";
import { boardGitLabSourceRoutes } from "./board-sources/board-gitlab-source.routes.js";
import { buildKeycloakAuthPlugin } from "./auth/keycloak-auth.plugin.js";
import { boardAccessRoutes } from "./board-access/board-access.routes.js";
import { userRoutes } from "./users/user.routes.js";
import { boardViewRoutes } from "./widgets/board-views.routes.js";
import { dashboardWidgetRoutes } from "./widgets/dashboard-widgets.routes.js";
import { widgetDataRoutes } from "./widgets/widget-data.routes.js";
import { presetsRoutes } from "./widgets/presets.routes.js";
import { intelligenceQueryRoutes } from "./intelligence-query/routes.js";
import { boardSyncRoutes } from "./board-sync/board-sync.routes.js";
import { boardTreeRoutes } from "./board-tree/board-tree.routes.js";
import { roadmapRoutes } from "./roadmap/roadmap.routes.js";
import { comparisonRoutes } from "./comparison/comparison.routes.js";
import { orgTreeRoutes } from "./org-trees/org-tree.routes.js";
import { orgTreeTimesheetRoutes } from "./org-trees/org-tree-timesheet.routes.js";
import { OrgTreeService } from "./org-trees/org-tree.service.js";
import { OrgSourceService } from "./org-trees/org-source.service.js";
import { employeeBoardRoutes } from "./employee-boards/employee-board.routes.js";
import { EmployeeBoardService } from "./employee-boards/employee-board.service.js";
import { roadmapsRoutes } from "./roadmaps/roadmap.routes.js";
import { TimesheetService } from "./timesheet/timesheet.service.js";
import { timesheetRoutes } from "./timesheet/timesheet.routes.js";
import { buildTimesheetDeps } from "./timesheet/timesheet-deps.js";
import { locationRoutes } from "./locations/location.routes.js";
import { loadEnterprise, COMMUNITY_STATUS } from "./enterprise-loader.js";
import type { RouteHost } from "./enterprise-contract.js";

export function buildServer(prisma: PrismaClient) {
  const uploadsDir = join(process.cwd(), "uploads");
  mkdirSync(uploadsDir, { recursive: true });

  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get("/health", async (_req, reply) => {
    return reply.send({ status: "ok" });
  });

  const uploadService = new UploadService(prisma, uploadsDir);

  // Protected routes — all require a valid Keycloak JWT
  app.register(async (protectedApp) => {
    protectedApp.register(buildKeycloakAuthPlugin(prisma));
    protectedApp.register(boardAccessRoutes, { prisma });
    protectedApp.register(userRoutes, { prisma });
    protectedApp.register(commentRoutes, { prisma, uploadService });
    protectedApp.register(boardRoutes, { prisma });
    protectedApp.register(recruitmentRoutes, { prisma });
    // Calendar→candidate ingest queue. Reuses the REDIS_URL env pattern as the other
    // queues below; falls back to no enqueue fn (route returns 503) when unset.
    const calendarSyncConnection = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : null;
    const calendarSourceSyncQueue = calendarSyncConnection
      ? new Queue('calendar-source-sync', { connection: calendarSyncConnection })
      : null;
    protectedApp.register(calendarSourceRoutes, {
      prisma,
      enqueueCalendarSync: async (boardId) => {
        if (!calendarSourceSyncQueue) throw new Error('calendar sync queue unavailable');
        await calendarSourceSyncQueue.add('calendar-source-sync', { boardId });
      },
    });
    protectedApp.register(boardTreeRoutes, { prisma });
    protectedApp.register(projectRoutes, { prisma });
    protectedApp.register(groupRoutes, { prisma });
    protectedApp.register(columnRoutes, { prisma });
    protectedApp.register(automationRoutes, { prisma });
    protectedApp.register(jiraInstanceRoutes, { prisma });
    protectedApp.register(ownerRoutes, { prisma });
    protectedApp.register(boardStatusRoutes, { prisma });
    protectedApp.register(uploadRoutes, { service: uploadService });
    protectedApp.register(githubRoutes, { prisma });
    protectedApp.register(azureDevOpsRoutes, { prisma });
    protectedApp.register(adoProjectSyncRoutes({ prisma }));
    protectedApp.register(gitlabRoutes({ prisma }));
    protectedApp.register(developerProfileRoutes({ prisma }));
    protectedApp.register(jiraProjectSyncRoutes({ prisma }));
    protectedApp.register(githubRepoSyncRoutes({ prisma }));
    protectedApp.register(gitlabProjectSyncRoutes({ prisma }));
    protectedApp.register(boardJiraSourceRoutes({ prisma, clickhouse }));

    // Three-tier BullMQ queue client for GitHub bulk-repo ingestion.
    // Matches the worker's queue names + repeat intervals (see
    // @deckgauge/shared GITHUB_SYNC_QUEUE_NAMES). When REDIS_URL is unset
    // we fall back to a no-op so the api still boots in unit-test contexts.
    const githubBulkConnection = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : null;
    const githubQueueClient = githubBulkConnection
      ? makeGitHubQueueClient({
          hot: new Queue(GITHUB_SYNC_QUEUE_NAMES.hot, { connection: githubBulkConnection }),
          warm: new Queue(GITHUB_SYNC_QUEUE_NAMES.warm, { connection: githubBulkConnection }),
          cold: new Queue(GITHUB_SYNC_QUEUE_NAMES.cold, { connection: githubBulkConnection }),
        })
      : undefined;

    protectedApp.register(
      boardGitHubSourceRoutes({ prisma, clickhouse, queueClient: githubQueueClient }),
    );
    protectedApp.register(
      boardGitHubPickerRoutes({
        prisma,
        // Octokit factory keyed by GitHubInstance row. Honors GHE baseUrl
        // when set; accessToken is read per-call and never logged.
        octokitFor: (instance) =>
          new Octokit({
            auth: instance.accessToken,
            baseUrl: instance.baseUrl ?? "https://api.github.com",
          }),
      }),
    );
    protectedApp.register(boardAdoSourceRoutes({ prisma, clickhouse }));
    protectedApp.register(boardGitLabSourceRoutes({ prisma, clickhouse }));
    protectedApp.register(boardViewRoutes, { prisma });
    protectedApp.register(dashboardWidgetRoutes, { prisma });
    protectedApp.register(widgetDataRoutes, { prisma });
    protectedApp.register(presetsRoutes, { prisma });
    protectedApp.register(intelligenceQueryRoutes, { prisma });
    protectedApp.register(roadmapRoutes, { prisma });
    protectedApp.register(roadmapsRoutes, { prisma });
    protectedApp.register(comparisonRoutes, { prisma });

    // Org-tree sync queue. Reuses the same REDIS_URL env var pattern as the
    // GitHub bulk-ingestion queues above; falls back to no-op when unset.
    const orgTreeSyncConnection = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : null;
    const orgTreeSyncQueue = orgTreeSyncConnection
      ? new Queue('org-tree-sync', { connection: orgTreeSyncConnection })
      : null;
    const orgSourceSyncQueue = orgTreeSyncConnection
      ? new Queue('org-source-sync', { connection: orgTreeSyncConnection })
      : null;
    protectedApp.register(
      employeeBoardRoutes({ serviceFactory: () => new EmployeeBoardService(prisma) }),
    );
    protectedApp.register(
      orgTreeRoutes({
        serviceFactory: () => new OrgTreeService(prisma),
        clickhouse,
        prisma,
        uploadService,
        enqueueSync: async (treeId) => {
          if (!orgTreeSyncQueue) throw new Error('org-tree sync queue unavailable');
          await orgTreeSyncQueue.add('org-tree-sync', { treeId });
        },
        sourceService: new OrgSourceService(prisma),
        enqueueSourceSync: async (treeId) => {
          if (!orgSourceSyncQueue) throw new Error('org-source sync queue unavailable');
          await orgSourceSyncQueue.add('org-source-sync', { treeId });
        },
      }),
    );

    // EI-019 — Phase 3 intelligence routes. clickhouse is the shared
    // @clickhouse/client singleton exported from @deckgauge/db; its
    // query() signature already matches the ChQueryClient interface.
    const intelligenceService = new ClickhouseIntelligenceService({ client: clickhouse });

    // EI-022 — manual sync trigger. Wires BullMQ Queue clients to the
    // intelligence-sync queues the worker manages. When REDIS_URL isn't
    // set we leave enqueueSync undefined and the route returns 503 (graceful).
    const queues = buildIntelligenceQueues(process.env.REDIS_URL);
    const enqueueSync = queues
      ? async (source: 'jira' | 'github' | 'ado' | 'gitlab' | 'all') => {
          const trigger = { trigger: 'manual' as const };
          if (source === 'all') {
            await Promise.all([
              queues.jira.add('manual', trigger),
              queues.github.add('manual', trigger),
              queues.ado.add('manual', trigger),
              queues.gitlab.add('manual', trigger),
            ]);
            return;
          }
          await queues[source].add('manual', trigger);
        }
      : undefined;

    protectedApp.register(intelligenceRoutes({ service: intelligenceService, prisma, enqueueSync }));
    protectedApp.register(boardSyncRoutes({ prisma, queues }));

    const timesheetService = new TimesheetService(buildTimesheetDeps(prisma, clickhouse));
    protectedApp.register(timesheetRoutes({ service: timesheetService, prisma }));
    protectedApp.register(orgTreeTimesheetRoutes({ prisma, clickhouse }));
    protectedApp.register(locationRoutes);
  });

  // Open-core seam. When DECKGAUGE_EDITION=enterprise and the private
  // @deckgauge/enterprise module is present, load it and let it register its
  // (license-gated) routes. In the Community build the module is absent, this is
  // a no-op, and the platform runs fully as open source.
  // See planning/OPEN-CORE-ARCHITECTURE.md.
  app.register(async (entApp) => {
    const enterprise = await loadEnterprise();
    if (enterprise) {
      const status = await enterprise.verifyLicense();
      await enterprise.registerRoutes(entApp as unknown as RouteHost, status);
    } else {
      entApp.get("/enterprise/status", async () => ({
        edition: COMMUNITY_STATUS.edition,
        licenseState: COMMUNITY_STATUS.state,
        features: COMMUNITY_STATUS.features,
        message: COMMUNITY_STATUS.message,
      }));
    }
  });

  return app;
}
