import type { PrismaClient, Prisma } from '@deckgauge/db';
import { z } from 'zod';
import { NEW_WIDGET_TYPES } from '@deckgauge/shared';

const LayoutSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});

export const WIDGET_TYPES = [
  'STATUS_DISTRIBUTION',
  'STATUS_BY_GROUP',
  'ITEMS_BY_OWNER',
  'VELOCITY_LEADERBOARD',
  'COMPLETION_RATE',
  'RECENTLY_COMPLETED',
  'STUCK_ISSUES',
  'BLOCKED_ITEMS',
  'STALE_ITEMS',
  'TOTAL_COUNT',
  'STATUS_SUMMARY',
  // ClickHouse-powered widgets (P3 — Phase 3). Board-scoped via Board*Source tables.
  'CH_COMPLETION_TREND',
  'CH_VELOCITY',
  'CH_CYCLE_TIME_TREND',
  'CH_BACKLOG_AGE',
] as const;

// Every widget type the API can persist: the original board-state/ClickHouse
// widgets plus the intelligence widgets (LEAD_TIME_FOR_CHANGES … REVIEW_MIX)
// defined in shared. Kept as the union so the create schema stays in lockstep
// with widget-data.routes' KNOWN_WIDGET_TYPES and the web widget catalog.
export const ALL_WIDGET_TYPES = [...WIDGET_TYPES, ...NEW_WIDGET_TYPES] as const;

export const CreateWidgetSchema = z.object({
  widgetType: z.enum(ALL_WIDGET_TYPES),
  title: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()).default({}),
  layout: LayoutSchema,
});

export const UpdateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  layout: LayoutSchema.optional(),
});

export const BulkLayoutSchema = z.object({
  layouts: z.array(z.object({ id: z.string().uuid(), layout: LayoutSchema })),
});

export type CreateWidgetInput = z.infer<typeof CreateWidgetSchema>;
export type UpdateWidgetInput = z.infer<typeof UpdateWidgetSchema>;
export type BulkLayoutInput = z.infer<typeof BulkLayoutSchema>;

export class DashboardWidgetService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByView(boardViewId: string) {
    return this.prisma.dashboardWidget.findMany({
      where: { boardViewId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(boardViewId: string, input: CreateWidgetInput) {
    const validated = CreateWidgetSchema.parse(input);
    return this.prisma.dashboardWidget.create({
      data: {
        boardViewId,
        widgetType: validated.widgetType,
        title: validated.title,
        config: validated.config as Prisma.InputJsonValue,
        layout: validated.layout as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, input: UpdateWidgetInput) {
    const validated = UpdateWidgetSchema.parse(input);
    const data: Prisma.DashboardWidgetUpdateInput = {};
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.config !== undefined) data.config = validated.config as Prisma.InputJsonValue;
    if (validated.layout !== undefined) data.layout = validated.layout as unknown as Prisma.InputJsonValue;
    return this.prisma.dashboardWidget.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.dashboardWidget.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async updateBulkLayout(layouts: BulkLayoutInput['layouts']) {
    await this.prisma.$transaction(
      layouts.map((item) =>
        this.prisma.dashboardWidget.update({
          where: { id: item.id },
          data: { layout: item.layout as unknown as Prisma.InputJsonValue },
        })
      )
    );
  }
}
