import { z } from 'zod/v4';

export const AutomationTriggerTypeEnum = z.enum([
  'status_change',
  'date_arrives',
  'item_created',
]);
export type AutomationTriggerType = z.infer<typeof AutomationTriggerTypeEnum>;

export const AutomationActionTypeEnum = z.enum([
  'move_to_group',
  'change_status',
  'notify',
]);
export type AutomationActionType = z.infer<typeof AutomationActionTypeEnum>;

export const AutomationTriggerSchema = z.object({
  type: AutomationTriggerTypeEnum,
  field: z.string().optional(),
  value: z.string().optional(),
});
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;

export const AutomationActionSchema = z.object({
  type: AutomationActionTypeEnum,
  targetGroupId: z.string().uuid().optional(),
  targetStatus: z.string().optional(),
  message: z.string().optional(),
});
export type AutomationAction = z.infer<typeof AutomationActionSchema>;

export const AutomationRuleSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().trim().min(1),
  trigger: AutomationTriggerSchema,
  action: AutomationActionSchema,
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
});
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export const CreateAutomationRuleInputSchema = z.object({
  name: z.string().trim().min(1),
  trigger: AutomationTriggerSchema,
  action: AutomationActionSchema,
  enabled: z.boolean().default(true),
});
export type CreateAutomationRuleInput = z.infer<
  typeof CreateAutomationRuleInputSchema
>;

export const UpdateAutomationRuleInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  trigger: AutomationTriggerSchema.optional(),
  action: AutomationActionSchema.optional(),
  enabled: z.boolean().optional(),
});
export type UpdateAutomationRuleInput = z.infer<
  typeof UpdateAutomationRuleInputSchema
>;
