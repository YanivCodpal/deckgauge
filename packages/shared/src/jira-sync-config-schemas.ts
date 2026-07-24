import { z } from 'zod/v4';

export const FieldMappingSchema = z.record(z.string(), z.string());
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const StatusMappingSchema = z.record(z.string(), z.string());
export type StatusMapping = z.infer<typeof StatusMappingSchema>;

/** Maps Jira status names → board_status labels. Resolved to IDs at runtime. */
export const DEFAULT_STATUS_MAPPING: StatusMapping = {
  'To Do': 'Not Started',
  Open: 'Not Started',
  Backlog: 'Not Started',
  'In Progress': 'In Progress',
  'In Development': 'In Progress',
  'In Review': 'In Progress',
  Done: 'Done',
  Closed: 'Done',
  Resolved: 'Done',
  Blocked: 'Blocked',
  Cancelled: 'Done',
};

/** Legacy enum values for backwards compatibility with old sync configs. */
export const LEGACY_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  AT_RISK: 'At Risk',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const JiraSyncConfigSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  jiraInstanceId: z.string().uuid(),
  jiraProjectKey: z.string().min(1),
  allowedIssueTypes: z.array(z.string()),
  targetGroupId: z.string().uuid().nullable(),
  fieldMappings: FieldMappingSchema,
  defaultSyncedFields: z.array(z.string()),
  statusMapping: StatusMappingSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type JiraSyncConfig = z.infer<typeof JiraSyncConfigSchema>;

export const CreateJiraSyncConfigInputSchema = z.object({
  boardId: z.string().uuid(),
  jiraInstanceId: z.string().uuid(),
  jiraProjectKey: z.string().min(1),
  allowedIssueTypes: z.array(z.string()).min(1),
  fieldMappings: FieldMappingSchema.default({}),
  defaultSyncedFields: z.array(z.string()).default(['name', 'status', 'owner']),
  statusMapping: StatusMappingSchema.default(DEFAULT_STATUS_MAPPING),
});
export type CreateJiraSyncConfigInput = z.infer<typeof CreateJiraSyncConfigInputSchema>;

export const UpdateJiraSyncConfigInputSchema = z
  .object({
    allowedIssueTypes: z.array(z.string()).min(1).optional(),
    fieldMappings: FieldMappingSchema.optional(),
    defaultSyncedFields: z.array(z.string()).optional(),
    statusMapping: StatusMappingSchema.optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided' },
  );
export type UpdateJiraSyncConfigInput = z.infer<typeof UpdateJiraSyncConfigInputSchema>;

export const CURATED_JIRA_FIELDS = [
  { key: 'duedate', label: 'Due Date', columnType: 'DATE' as const },
  { key: 'priority', label: 'Priority', columnType: 'TEXT' as const },
  { key: 'labels', label: 'Labels', columnType: 'TEXT' as const },
  { key: 'customfield_10016', label: 'Story Points', columnType: 'NUMBER' as const },
  { key: 'sprint', label: 'Sprint', columnType: 'TEXT' as const },
  { key: 'fixVersions', label: 'Fix Version', columnType: 'TEXT' as const },
  { key: 'components', label: 'Component', columnType: 'TEXT' as const },
  { key: 'reporter', label: 'Reporter', columnType: 'PERSON' as const },
] as const;
