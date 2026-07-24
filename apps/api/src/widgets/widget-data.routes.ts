import { FastifyInstance } from 'fastify';
import { PrismaClient, clickhouse, type ClickHouseClient } from '@deckgauge/db';
import {
  NEW_WIDGET_TYPES,
  COMPARISON_WIDGET_TYPES,
  type WidgetScopeFlags,
} from '@deckgauge/shared';
import { WidgetDataService } from './widget-data.service.js';
import { WidgetCache } from './widget-cache.js';
import { WIDGET_TYPES } from './dashboard-widgets.service.js';

// Dispatch table. Entries land as their service methods do (C.2 - C.15 each add
// one). Keys are strings (not the narrow WidgetType union) because the new v1
// types live in NEW_WIDGET_TYPES rather than WIDGET_TYPES until Phase E folds
// them into the Zod schema.
const WIDGET_METHOD_MAP: Partial<Record<string, keyof WidgetDataService>> = {
  STATUS_DISTRIBUTION: 'getStatusDistribution',
  STATUS_BY_GROUP: 'getStatusByGroup',
  ITEMS_BY_OWNER: 'getItemsByOwner',
  VELOCITY_LEADERBOARD: 'getVelocityLeaderboard',
  COMPLETION_RATE: 'getCompletionRate',
  RECENTLY_COMPLETED: 'getRecentlyCompleted',
  STUCK_ISSUES: 'getStuckIssues',
  BLOCKED_ITEMS: 'getBlockedItems',
  STALE_ITEMS: 'getStaleItems',
  TOTAL_COUNT: 'getTotalCount',
  STATUS_SUMMARY: 'getStatusSummary',
  CH_COMPLETION_TREND: 'getChCompletionTrend',
  CH_VELOCITY: 'getChVelocity',
  CH_CYCLE_TIME_TREND: 'getChCycleTimeTrend',
  CH_BACKLOG_AGE: 'getChBacklogAge',
  LEAD_TIME_FOR_CHANGES: 'getLeadTimeForChanges',
  PR_CYCLE_TIME_SCATTER: 'getPrCycleTimeScatter',
  REVIEW_PICKUP_TIME: 'getReviewPickupTime',
  PR_SIZE_DISTRIBUTION: 'getPrSizeDistribution',
  MERGE_FREQUENCY_PER_DEV: 'getMergeFrequencyPerDev',
  REWORK_RATE: 'getReworkRate',
  BUG_RATE: 'getBugRate',
  ITERATION_PLANNING_ACCURACY: 'getIterationPlanningAccuracy',
  VELOCITY_WITH_CONFIDENCE: 'getVelocityWithConfidence',
  INITIATIVE_RISK_RADAR: 'getInitiativeRiskRadar',
  ISSUES_OPENED_VS_CLOSED: 'getIssuesOpenedVsClosed',
  WIP_COUNT: 'getWipCount',
  TICKET_COVERAGE_RATE: 'getTicketCoverageRate',
  AI_ASSISTED_PR_PCT: 'getAiAssistedPrPct',
  REVIEW_MIX: 'getReviewMix',
  BOT_VS_HUMAN: 'getBotVsHuman',
  COMMITS_PER_DEV: 'getCommitsPerDev',
  REVIEWER_PARTICIPATION: 'getReviewerParticipation',
  REVIEW_QUALITY_INDEX: 'getReviewQualityIndex',
  REVIEW_QUALITY_TREND: 'getReviewQualityTrend',
  FLOW_THROUGHPUT_CYCLE: 'getFlowThroughputCycle',
  DELIVERY_TREND_ANNOTATED: 'getDeliveryTrendAnnotated',
  AI_ADOPTION: 'getAiAdoption',
  INVESTMENT_ALLOCATION: 'getInvestmentAllocation',
  DORA_METRICS: 'getDoraMetrics',
  // P6 — multi-board comparison widgets. The `:boardId` route slot carries the
  // Comparison id; each method fans an existing single-board method out
  // over the comparison's board set (comparison_members).
  COMPARE_REVIEW_QUALITY: 'getCompareReviewQuality',
  COMPARE_FLOW: 'getCompareFlow',
  COMPARE_DELIVERY: 'getCompareDelivery',
};

// Single source of truth: every widget name the API recognises. The 14 NEW_WIDGET_TYPES
// are registered here at C.1 even though their service methods land later (C.2–C.15),
// so the picker / registry can reference them without unknown-type rejections.
const KNOWN_WIDGET_TYPES: ReadonlySet<string> = new Set<string>([
  ...WIDGET_TYPES,
  ...NEW_WIDGET_TYPES,
  ...COMPARISON_WIDGET_TYPES,
]);

export function throwIfUnknownWidgetType(t: string): void {
  if (!KNOWN_WIDGET_TYPES.has(t)) {
    throw new Error(`unknown widget type: ${t}`);
  }
}

export async function widgetDataRoutes(
  app: FastifyInstance,
  { prisma, clickhouse: ch }: { prisma: PrismaClient; clickhouse?: ClickHouseClient }
) {
  const service = new WidgetDataService(prisma, ch ?? clickhouse);
  const cache = new WidgetCache(60_000);

  // Fail fast: surface any persisted widgetType the API no longer knows about
  // (e.g. orphaned by a rename). Throws during plugin init, aborting server startup.
  const persisted = await prisma.dashboardWidget.findMany({
    select: { widgetType: true },
    distinct: ['widgetType'],
  });
  for (const row of persisted) {
    throwIfUnknownWidgetType(row.widgetType);
  }

  app.get<{ Params: { boardId: string; widgetType: string }; Querystring: { config?: string } }>(
    '/boards/:boardId/widgets/:widgetType/data',
    async (req, reply) => {
      const { boardId, widgetType } = req.params;

      if (!KNOWN_WIDGET_TYPES.has(widgetType)) {
        return reply.status(400).send({ error: `Unknown widget type: ${widgetType}` });
      }

      const method = WIDGET_METHOD_MAP[widgetType];
      if (!method) {
        return reply
          .status(501)
          .send({ error: `Widget type not yet implemented: ${widgetType}` });
      }

      const config = req.query.config ? JSON.parse(req.query.config) : {};
      let cacheKey = WidgetCache.makeKey(boardId, widgetType, config);

      // Comparison widgets fan out over a Comparison's persisted member board
      // set, which is NOT part of (boardId, widgetType, config) — boardId here
      // is the fixed comparison id. Without folding that set into the cache key,
      // adding or removing a board serves the previous payload for the whole
      // 60s TTL (the board never appears / lingers until the entry expires).
      if ((COMPARISON_WIDGET_TYPES as readonly string[]).includes(widgetType)) {
        const members = await prisma.comparisonMember.findMany({
          where: { comparisonId: boardId },
          orderBy: { position: 'asc' },
          select: { boardId: true },
        });
        cacheKey += `:${members.map((m) => m.boardId).join(',')}`;
      }

      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const fn = service[method] as (boardId: string, config: Record<string, unknown>) => Promise<unknown>;
      const data = await fn.call(service, boardId, config);

      cache.set(cacheKey, data);
      return data;
    }
  );

  // Source-kind presence flags for the current board. Used by the widget
  // picker (to disable widgets the board cannot run) and by future preset
  // banners (to flag widgets that became available after a source was added).
  app.get<{ Params: { boardId: string } }>(
    '/boards/:boardId/widget-scope',
    async (req): Promise<WidgetScopeFlags> => {
      const { boardId } = req.params;
      const [jira, github, gitlab, ado] = await Promise.all([
        prisma.boardJiraSource.count({ where: { boardId } }),
        prisma.boardGitHubSource.count({ where: { boardId } }),
        prisma.boardGitLabSource.count({ where: { boardId } }),
        prisma.boardAdoSource.count({ where: { boardId } }),
      ]);
      return {
        hasJira: jira > 0,
        hasGitHub: github > 0,
        hasGitLab: gitlab > 0,
        hasAdo: ado > 0,
      };
    }
  );
}
