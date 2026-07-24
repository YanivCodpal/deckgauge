import { z } from "zod/v4";

export const SyncRunStatusEnum = z.enum(["pending", "completed", "failed"]);
export type SyncRunStatus = z.infer<typeof SyncRunStatusEnum>;

export const SyncRunTriggerEnum = z.enum(["startup", "manual", "scheduled"]);
export type SyncRunTrigger = z.infer<typeof SyncRunTriggerEnum>;

export const JiraEpicSchema = z.object({
  id: z.string(),
  key: z.string(),
  projectKey: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  assignee: z.string().nullable(),
  updatedAt: z.coerce.date(),
});

export type JiraEpic = z.infer<typeof JiraEpicSchema>;

export const JiraIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  projectKey: z.string(),
  epicKey: z.string().nullable(),
  summary: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  assignee: z.string().nullable(),
  type: z.string(),
  updatedAt: z.coerce.date(),
});

export type JiraIssue = z.infer<typeof JiraIssueSchema>;

export const SyncRunSchema = z.object({
  id: z.string(),
  status: SyncRunStatusEnum,
  trigger: SyncRunTriggerEnum,
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable(),
  errorMessage: z.string().nullable(),
  epicCount: z.number().int(),
  issueCount: z.number().int(),
});

export type SyncRun = z.infer<typeof SyncRunSchema>;
