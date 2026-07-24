import { z } from 'zod/v4';

// ── Auth ────────────────────────────────────────────────────────────────────

export const AzureDevOpsAuthMethodSchema = z.enum(['PAT', 'BASIC']);
export type AzureDevOpsAuthMethod = z.infer<typeof AzureDevOpsAuthMethodSchema>;

// ── Work Item DTO (returned by adapter) ─────────────────────────────────────

export const AzureDevOpsWorkItemSchema = z.object({
  adoId: z.number().int(),
  adoParentId: z.number().int().nullable(),
  type: z.string(),
  title: z.string(),
  state: z.string(),
  assignedTo: z.string().nullable(),
  areaPath: z.string().nullable(),
  iterationPath: z.string().nullable(),
  description: z.string().nullable(),
  fields: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
  changedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable(),
});

export type AzureDevOpsWorkItem = z.infer<typeof AzureDevOpsWorkItemSchema>;

// ── Instance ────────────────────────────────────────────────────────────────

export const AzureDevOpsInstanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  orgUrl: z.string().url(),
  authMethod: AzureDevOpsAuthMethodSchema,
  accessToken: z.string().min(1),
  username: z.string().nullable(),
  projects: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AzureDevOpsInstance = z.infer<typeof AzureDevOpsInstanceSchema>;

export const CreateAzureDevOpsInstanceInputSchema = z.object({
  name: z.string().min(1),
  orgUrl: z.string().url(),
  authMethod: AzureDevOpsAuthMethodSchema,
  accessToken: z.string().min(1),
  username: z.string().nullable().optional(),
  projects: z.array(z.string()).default([]),
});

export type CreateAzureDevOpsInstanceInput = z.infer<typeof CreateAzureDevOpsInstanceInputSchema>;

export const UpdateAzureDevOpsInstanceInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    orgUrl: z.string().url().optional(),
    authMethod: AzureDevOpsAuthMethodSchema.optional(),
    accessToken: z.string().min(1).optional(),
    username: z.string().nullable().optional(),
    projects: z.array(z.string()).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export type UpdateAzureDevOpsInstanceInput = z.infer<typeof UpdateAzureDevOpsInstanceInputSchema>;

// ── Sync Config ─────────────────────────────────────────────────────────────

export const FieldMappingSchema = z.record(z.string(), z.string());
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const StatusMappingSchema = z.record(z.string(), z.string());
export type StatusMapping = z.infer<typeof StatusMappingSchema>;

/** Default Azure DevOps state → board status label mapping. */
export const ADO_DEFAULT_STATUS_MAPPING: StatusMapping = {
  New: 'Not Started',
  'To Do': 'Not Started',
  Active: 'In Progress',
  Resolved: 'In Progress',
  Closed: 'Done',
  Removed: 'Done',
};

export const AzureDevOpsSyncConfigSchema = z.object({
  id: z.string().uuid(),
  azureDevOpsInstanceId: z.string().uuid(),
  adoProject: z.string().min(1),
  boardId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable(),
  allowedWorkItemTypes: z.array(z.string()),
  wiqlFilter: z.string().nullable(),
  fieldMappings: FieldMappingSchema,
  statusMapping: StatusMappingSchema,
  defaultSyncedFields: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AzureDevOpsSyncConfig = z.infer<typeof AzureDevOpsSyncConfigSchema>;

export const CreateAzureDevOpsSyncConfigInputSchema = z.object({
  azureDevOpsInstanceId: z.string().uuid(),
  adoProject: z.string().min(1),
  boardId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedWorkItemTypes: z.array(z.string()).min(1),
  wiqlFilter: z.string().nullable().optional(),
  fieldMappings: FieldMappingSchema.default({}),
  statusMapping: StatusMappingSchema.default(ADO_DEFAULT_STATUS_MAPPING),
  defaultSyncedFields: z.array(z.string()).default(['name', 'status', 'owner']),
});

export type CreateAzureDevOpsSyncConfigInput = z.infer<
  typeof CreateAzureDevOpsSyncConfigInputSchema
>;

export const UpdateAzureDevOpsSyncConfigInputSchema = z
  .object({
    allowedWorkItemTypes: z.array(z.string()).min(1).optional(),
    wiqlFilter: z.string().nullable().optional(),
    fieldMappings: FieldMappingSchema.optional(),
    statusMapping: StatusMappingSchema.optional(),
    defaultSyncedFields: z.array(z.string()).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export type UpdateAzureDevOpsSyncConfigInput = z.infer<
  typeof UpdateAzureDevOpsSyncConfigInputSchema
>;

// ── Phase 3 Project Sync (intelligence pipeline) ───────────────────────────

export const AzureDevOpsProjectSyncSchema = z.object({
  id: z.string().uuid(),
  azureDevOpsInstanceId: z.string().uuid(),
  adoProject: z.string().min(1),
  syncPrs: z.boolean(),
  syncCommits: z.boolean(),
  syncRepos: z.array(z.string()),
  syncAllRepos: z.boolean(),
  lastSyncedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AzureDevOpsProjectSync = z.infer<typeof AzureDevOpsProjectSyncSchema>;

export const UpsertAzureDevOpsProjectSyncInputSchema = z.object({
  adoProject: z.string().min(1),
  syncPrs: z.boolean().default(true),
  syncCommits: z.boolean().default(false),
  syncRepos: z.array(z.string()).default([]),
  syncAllRepos: z.boolean().default(false),
});
export type UpsertAzureDevOpsProjectSyncInput = z.infer<typeof UpsertAzureDevOpsProjectSyncInputSchema>;

export const UpdateAzureDevOpsProjectSyncInputSchema = z
  .object({
    syncPrs: z.boolean().optional(),
    syncCommits: z.boolean().optional(),
    syncRepos: z.array(z.string()).optional(),
    syncAllRepos: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateAzureDevOpsProjectSyncInput = z.infer<typeof UpdateAzureDevOpsProjectSyncInputSchema>;

export const AzureDevOpsRepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultBranch: z.string().nullable(),
  webUrl: z.string().nullable(),
});
export type AzureDevOpsRepository = z.infer<typeof AzureDevOpsRepositorySchema>;
