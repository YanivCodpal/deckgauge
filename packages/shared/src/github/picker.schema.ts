import { z } from 'zod';

export const PickerQuerySchema = z.object({
  instanceId: z.string().min(1),
  pattern: z.string().max(100).default(''),
  page: z.number().int().positive().default(1),
  includeArchived: z.boolean().default(false),
});
export type PickerQuery = z.infer<typeof PickerQuerySchema>;

export const PickerRepoSchema = z.object({
  fullName: z.string(),
  defaultBranch: z.string(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  archived: z.boolean(),
  lastPushedAt: z.string().datetime().nullable(),
  openIssuesCount: z.number().int().nonnegative(),
  enabled: z.boolean(),
});
export type PickerRepo = z.infer<typeof PickerRepoSchema>;

export const PickerResponseSchema = z.object({
  repos: z.array(PickerRepoSchema),
  totalMatched: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable(),
});
export type PickerResponse = z.infer<typeof PickerResponseSchema>;

// Returned (not thrown) by the listGitHubPicker action when the picker request
// fails — server-action throws reach the browser as opaque digests, so the
// error must travel as a value the client can inspect. `code` is 'github_auth_failed'
// when the connection's token is expired/revoked (drives the token-replace UI).
export const GitHubPickerErrorSchema = z.object({
  pickerError: z.literal(true),
  code: z.string(),
  message: z.string(),
  status: z.number().int(),
});
export type GitHubPickerError = z.infer<typeof GitHubPickerErrorSchema>;

export const BulkBindRequestSchema = z.object({
  instanceId: z.string().min(1),
  repos: z.array(z.string().regex(/^[^/]+\/[^/]+$/)).min(1).max(500),
  backfillMonths: z.number().int().min(1).max(60),
  targetGroupId: z.string().nullable().optional(),
});
export type BulkBindRequest = z.infer<typeof BulkBindRequestSchema>;

export const BulkBindResponseSchema = z.object({
  addedCount: z.number().int().nonnegative(),
  reEnabledCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  estimatedBackfillRequests: z.number().int().nonnegative(),
  estimatedBackfillMinutes: z.number().int().nonnegative(),
});
export type BulkBindResponse = z.infer<typeof BulkBindResponseSchema>;
