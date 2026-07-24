import type { PrismaClient } from '@deckgauge/db';

export interface OrgTreeTimesheetConfigValue {
  activeStatuses: string[];
  /** Per-day working-hours cap. null = use the engine default (8h); 0 = uncapped. */
  dailyCapHours: number | null;
}

/** Per-org-tree timesheet config (Postgres). One row per tree. */
export class OrgTreeTimesheetConfigService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the saved config, or null when the tree has no config row (unconfigured → fallback). */
  async get(orgTreeId: string): Promise<OrgTreeTimesheetConfigValue | null> {
    const row = await this.prisma.orgTreeTimesheetConfig.findUnique({ where: { orgTreeId } });
    return row ? { activeStatuses: row.activeStatuses, dailyCapHours: row.dailyCapHours } : null;
  }

  /** Upsert the config for a tree. An empty active-status list is a valid, explicit "count nothing". */
  async put(
    orgTreeId: string,
    value: OrgTreeTimesheetConfigValue,
  ): Promise<OrgTreeTimesheetConfigValue> {
    const { activeStatuses, dailyCapHours } = value;
    const row = await this.prisma.orgTreeTimesheetConfig.upsert({
      where: { orgTreeId },
      create: { orgTreeId, activeStatuses, dailyCapHours },
      update: { activeStatuses, dailyCapHours },
    });
    return { activeStatuses: row.activeStatuses, dailyCapHours: row.dailyCapHours };
  }
}
