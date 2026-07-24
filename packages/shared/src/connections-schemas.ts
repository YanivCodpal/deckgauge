import { z } from 'zod';

// ── Jira ────────────────────────────────────────────────────────────────────
export const JiraProjectSyncSchema = z.object({
  id: z.string().uuid(),
  jiraInstanceId: z.string().uuid(),
  jiraProjectKey: z.string().min(1),
  syncChangelog: z.boolean(),
  syncWorklogs: z.boolean(),
  lastSyncedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  boardCount: z.number().int().min(0),
});
export type JiraProjectSyncDto = z.infer<typeof JiraProjectSyncSchema>;
export const JiraProjectSyncListSchema = z.array(JiraProjectSyncSchema);

export const JiraProjectSyncCreateSchema = z.object({
  jiraInstanceId: z.string().uuid(),
  jiraProjectKey: z.string().min(1),
  syncChangelog: z.boolean().default(true),
  syncWorklogs: z.boolean().default(false),
});

export const BoardJiraSourceSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  jiraProjectSyncId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable(),
  allowedIssueTypes: z.array(z.string()),
  statusMapping: z.record(z.string(), z.string()),
  defaultSyncedFields: z.array(z.string()),
  lastPromotedAt: z.string().datetime().nullable(),
});
export const BoardJiraSourceCreateSchema = z.object({
  boardId: z.string().uuid(),
  jiraProjectSyncId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedIssueTypes: z.array(z.string()).default([]),
  jqlFilter: z.string().nullable().optional(),
  statusMapping: z.record(z.string(), z.string()).default({}),
  defaultSyncedFields: z.array(z.string()).default(['name', 'status', 'owner']),
});

export const BoardJiraSourcePatchSchema = z.object({
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedIssueTypes: z.array(z.string()).optional(),
  jqlFilter: z.string().nullable().optional(),
  statusMapping: z.record(z.string(), z.string()).optional(),
  defaultSyncedFields: z.array(z.string()).optional(),
});

// ── GitHub ──────────────────────────────────────────────────────────────────
// GitHubRepoSync.id is `@default(cuid())` (not uuid like the rest of the
// schema), and legacy rows may still carry a uuid — so accept any non-empty id.
export const GitHubRepoSyncSchema = z.object({
  id: z.string().min(1),
  githubInstanceId: z.string().uuid(),
  repoFullName: z.string().regex(/^[^/]+\/[^/]+$/),
  syncPrs: z.boolean(),
  syncCommits: z.boolean(),
  lastSyncedAt: z.string().datetime().nullable(),
  lastCommitSyncAt: z.string().datetime().nullable(),
  boardCount: z.number().int().min(0),
});
export const BoardGitHubSourceCreateSchema = z.object({
  boardId: z.string().uuid(),
  gitHubRepoSyncId: z.string().min(1),
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedLabels: z.array(z.string()).default([]),
  allowedTypes: z.array(z.string()).default([]),
  includeClosedIssues: z.boolean().default(false),
  statusMapping: z.record(z.string(), z.string()).default({}),
  defaultSyncedFields: z.array(z.string()).default(['name', 'description', 'status', 'owner']),
  syncIssuesToBoard: z.boolean().default(true),
  useForIntelligence: z.boolean().default(true),
});

export const BoardGitHubSourcePatchSchema = z.object({
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedLabels: z.array(z.string()).optional(),
  allowedTypes: z.array(z.string()).optional(),
  includeClosedIssues: z.boolean().optional(),
  statusMapping: z.record(z.string(), z.string()).optional(),
  defaultSyncedFields: z.array(z.string()).optional(),
  syncIssuesToBoard: z.boolean().optional(),
  useForIntelligence: z.boolean().optional(),
});

// ── ADO ─────────────────────────────────────────────────────────────────────
export const AdoProjectSyncSchema = z.object({
  id: z.string().uuid(),
  azureDevOpsInstanceId: z.string().uuid(),
  adoProject: z.string().min(1),
  syncPrs: z.boolean(),
  syncCommits: z.boolean(),
  syncRepos: z.array(z.string()),
  lastSyncedAt: z.string().datetime().nullable(),
  boardCount: z.number().int().min(0),
});
export const BoardAdoSourceCreateSchema = z.object({
  boardId: z.string().uuid(),
  azureDevOpsProjectSyncId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedWorkItemTypes: z.array(z.string()).default([]),
  wiqlFilter: z.string().nullable().optional(),
  statusMapping: z.record(z.string(), z.string()).default({}),
  defaultSyncedFields: z.array(z.string()).default(['name', 'status', 'owner']),
  syncWorkItemsToBoard: z.boolean().default(true),
  useForIntelligence: z.boolean().default(true),
});

export const BoardAdoSourcePatchSchema = z.object({
  targetGroupId: z.string().uuid().nullable().optional(),
  allowedWorkItemTypes: z.array(z.string()).optional(),
  wiqlFilter: z.string().nullable().optional(),
  statusMapping: z.record(z.string(), z.string()).optional(),
  defaultSyncedFields: z.array(z.string()).optional(),
  syncWorkItemsToBoard: z.boolean().optional(),
  useForIntelligence: z.boolean().optional(),
});

// ── GitLab ──────────────────────────────────────────────────────────────────
export const GitLabProjectSyncSchema = z.object({
  id: z.string().uuid(),
  gitlabInstanceId: z.string().uuid(),
  projectPath: z.string().min(1),
  syncPrs: z.boolean(),
  syncCommits: z.boolean(),
  lastSyncedAt: z.string().datetime().nullable(),
  boardCount: z.number().int().min(0),
});
export const BoardGitLabSourceCreateSchema = z.object({
  boardId: z.string().uuid(),
  gitlabProjectSyncId: z.string().uuid(),
  targetGroupId: z.string().uuid().nullable().optional(),
  syncIssuesToBoard: z.boolean().default(false),
  syncMrsToBoard: z.boolean().default(false),
});

export const BoardGitLabSourcePatchSchema = z.object({
  targetGroupId: z.string().uuid().nullable().optional(),
  syncIssuesToBoard: z.boolean().optional(),
  syncMrsToBoard: z.boolean().optional(),
});
