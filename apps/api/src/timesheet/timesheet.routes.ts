import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { Prisma } from '@deckgauge/db';
import {
  TimesheetGridQuerySchema,
  CapexReportQuerySchema,
  EpicBreakdownQuerySchema,
  IntervalsQuerySchema,
  PutStatusRulesSchema,
  type StatusRuleDto,
} from '@deckgauge/shared';
import type { TimesheetService } from './timesheet.service.js';

export interface TimesheetRoutesDeps {
  service: TimesheetService;
  prisma: PrismaClient;
}

interface RuleRow {
  id: string;
  scope: 'ROLE' | 'EMPLOYEE';
  role: string | null;
  employeeId: string | null;
  inProgressStatuses: string[];
}

function toDto(r: RuleRow): StatusRuleDto {
  return {
    id: r.id,
    scope: r.scope,
    role: r.role,
    employeeId: r.employeeId,
    inProgressStatuses: r.inProgressStatuses,
  };
}

export function timesheetRoutes(deps: TimesheetRoutesDeps): FastifyPluginAsync {
  return async function plugin(app: FastifyInstance) {
    const { service, prisma } = deps;

    app.get('/timesheet/grid', async (req, reply) => {
      const parsed = TimesheetGridQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return reply.send(await service.getGrid(parsed.data));
    });

    app.get('/timesheet/capex-report', async (req, reply) => {
      const parsed = CapexReportQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return reply.send(await service.getCapexReport(parsed.data));
    });

    app.get('/timesheet/epic-breakdown', async (req, reply) => {
      const parsed = EpicBreakdownQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return reply.send(await service.getEpicBreakdown(parsed.data));
    });

    app.get('/timesheet/intervals', async (req, reply) => {
      const parsed = IntervalsQuerySchema.safeParse(req.query);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      return reply.send(await service.getIntervals(parsed.data));
    });

    app.get('/timesheet/status-rules', async (_req, reply) => {
      const rules = (await prisma.timesheetStatusRule.findMany()) as RuleRow[];
      return reply.send(rules.map(toDto));
    });

    app.put('/timesheet/status-rules', async (req, reply) => {
      const parsed = PutStatusRulesSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
      const created = (await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.timesheetStatusRule.deleteMany({});
        await tx.timesheetStatusRule.createMany({ data: parsed.data.rules });
        return tx.timesheetStatusRule.findMany();
      })) as RuleRow[];
      return reply.send(created.map(toDto));
    });
  };
}
