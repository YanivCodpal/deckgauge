import { z } from 'zod';

export const SaveOrgSourceInputSchema = z.object({
  rootUpn: z.string().trim().min(1, 'root person email/UPN is required'),
});
export type SaveOrgSourceInput = z.infer<typeof SaveOrgSourceInputSchema>;

export const OrgSourceSyncSummarySchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  departed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});
export type OrgSourceSyncSummaryT = z.infer<typeof OrgSourceSyncSummarySchema>;

export const OrgSourceConfigSchema = z.object({
  orgTreeId: z.string().uuid(),
  provider: z.string(),
  rootUpn: z.string(),
  status: z.enum(['idle', 'syncing', 'error']),
  lastSyncedAt: z.string().nullable(),
  lastSyncSummary: OrgSourceSyncSummarySchema.nullable(),
  // Per-user delegated Microsoft OAuth connection state. The refresh token itself
  // is NEVER exposed here — only whether a connection exists and who made it.
  connected: z.boolean(),
  microsoftUpn: z.string().nullable(),
  connectedByEmail: z.string().nullable(),
  connectedAt: z.string().nullable(),
});
export type OrgSourceConfig = z.infer<typeof OrgSourceConfigSchema>;

// Server-to-server payload for storing a Microsoft Graph connection. Carries either
// a user-pasted access token (paste-token flow) or a delegated refresh token
// (device-code flow) — at least one is required. Tokens never reach the browser.
export const SaveOrgSourceConnectionSchema = z
  .object({
    accessToken: z.string().trim().min(1).optional(),
    refreshToken: z.string().trim().min(1).optional(),
    microsoftUpn: z.string().trim().min(1),
    connectedByEmail: z.string().trim().min(1).nullable().optional(),
  })
  .refine((v) => Boolean(v.accessToken || v.refreshToken), {
    message: 'accessToken or refreshToken is required',
  });
export type SaveOrgSourceConnectionInput = z.infer<typeof SaveOrgSourceConnectionSchema>;
