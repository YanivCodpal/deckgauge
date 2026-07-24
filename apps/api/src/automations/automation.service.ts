import type { PrismaClient } from '@deckgauge/db';
import { z } from 'zod';

/**
 * Maps default board status labels to their ProjectStatus enum equivalents.
 * Custom board status labels that don't appear here won't trigger enum-value automations.
 */
const BOARD_STATUS_LABEL_TO_ENUM: Record<string, string> = {
  'Not Started': 'NOT_STARTED',
  'In Progress': 'IN_PROGRESS',
  'At Risk': 'AT_RISK',
  'Blocked': 'BLOCKED',
  'Done': 'DONE',
};

const TriggerSchema = z.object({
  type: z.enum(['status_change', 'date_arrives', 'item_created']),
  field: z.string().optional(),
  value: z.string().optional(),
});

const ActionSchema = z.object({
  type: z.enum(['move_to_group', 'change_status', 'notify']),
  targetGroupId: z.string().uuid().optional(),
  targetStatus: z.string().optional(),
  message: z.string().optional(),
});

export const CreateAutomationInputSchema = z.object({
  name: z.string().trim().min(1),
  trigger: TriggerSchema,
  action: ActionSchema,
  enabled: z.boolean().default(true),
});
export type CreateAutomationInput = z.infer<typeof CreateAutomationInputSchema>;

export const UpdateAutomationInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  trigger: TriggerSchema.optional(),
  action: ActionSchema.optional(),
  enabled: z.boolean().optional(),
});
export type UpdateAutomationInput = z.infer<typeof UpdateAutomationInputSchema>;

export class AutomationService {
  constructor(private readonly prisma: PrismaClient) {}

  async listByBoard(boardId: string) {
    return await this.prisma.automationRule.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(boardId: string, input: CreateAutomationInput) {
    const validated = CreateAutomationInputSchema.parse(input);

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) return null;

    return await this.prisma.automationRule.create({
      data: {
        boardId,
        name: validated.name,
        trigger: validated.trigger,
        action: validated.action,
        enabled: validated.enabled,
      },
    });
  }

  async update(id: string, input: UpdateAutomationInput) {
    const validated = UpdateAutomationInputSchema.parse(input);

    const existing = await this.prisma.automationRule.findUnique({
      where: { id },
    });
    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (validated.name !== undefined) data.name = validated.name;
    if (validated.trigger !== undefined) data.trigger = validated.trigger;
    if (validated.action !== undefined) data.action = validated.action;
    if (validated.enabled !== undefined) data.enabled = validated.enabled;

    return await this.prisma.automationRule.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.automationRule.findUnique({
      where: { id },
    });
    if (!existing) return false;

    await this.prisma.automationRule.delete({ where: { id } });
    return true;
  }

  /**
   * Evaluate automation rules after a project update.
   * Called by the project service after PATCH /projects/:id.
   *
   * Handles two status-change paths:
   *  1. `status` enum changed directly (boards without custom statuses).
   *  2. `statusId` changed (custom board statuses via DynamicStatusPill) but the
   *     enum `status` field was not updated — we look up the board status label and
   *     map it to the enum equivalent so triggers still fire correctly.
   */
  async evaluateTriggers(
    boardId: string,
    projectId: string,
    changes: {
      status?: string;
      previousStatus?: string;
      statusId?: string | null;
      previousStatusId?: string | null;
    },
  ) {
    const rules = await this.prisma.automationRule.findMany({
      where: { boardId, enabled: true },
    });

    for (const rule of rules) {
      const trigger = rule.trigger as { type: string; value?: string };
      const action = rule.action as {
        type: string;
        targetGroupId?: string;
        targetStatus?: string;
        message?: string;
      };

      let matches = false;

      if (trigger.type === 'status_change') {
        // The AutomationPanel UI stores the board-status *label* (e.g. "Done")
        // as trigger.value, but the live status is compared in its enum form
        // ("DONE"). Normalize the trigger value through the same label→enum map
        // so default-status labels match. Custom labels (no enum equivalent)
        // and legacy enum-form trigger values pass through unchanged.
        const triggerValue = trigger.value
          ? BOARD_STATUS_LABEL_TO_ENUM[trigger.value] ?? trigger.value
          : undefined;

        // Path 1: enum status changed
        if (
          changes.status !== undefined &&
          changes.status !== changes.previousStatus
        ) {
          if (!triggerValue || triggerValue === changes.status) {
            matches = true;
          }
        }

        // Path 2: custom statusId changed but enum status did not
        if (
          !matches &&
          changes.statusId !== undefined &&
          changes.statusId !== changes.previousStatusId &&
          changes.statusId !== null
        ) {
          const boardStatus = await this.prisma.boardStatus.findUnique({
            where: { id: changes.statusId },
          });
          if (boardStatus) {
            const enumEquivalent = BOARD_STATUS_LABEL_TO_ENUM[boardStatus.label];
            const effectiveStatus = enumEquivalent ?? boardStatus.label;
            if (!triggerValue || triggerValue === effectiveStatus) {
              matches = true;
            }
          }
        }
      }

      if (trigger.type === 'item_created' && changes.previousStatus === undefined) {
        matches = true;
      }

      if (!matches) continue;

      if (action.type === 'move_to_group' && action.targetGroupId) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { groupId: action.targetGroupId },
        });
      } else if (action.type === 'change_status' && action.targetStatus) {
        await this.prisma.project.update({
          where: { id: projectId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { status: action.targetStatus as unknown as any },
        });
      } else if (action.type === 'notify' && action.message) {
        console.log(
          `[Automation] ${rule.name}: ${action.message} (project: ${projectId})`,
        );
      }
    }
  }
}
