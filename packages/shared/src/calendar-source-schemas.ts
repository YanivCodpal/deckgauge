import { z } from 'zod';

// DTO returned to the browser for a board's calendar source connection state.
// The stored Graph tokens are NEVER exposed here — only whether a connection
// exists and who made it.
export const BoardCalendarSourceConfigSchema = z.object({
  connected: z.boolean(),
  calendarUpn: z.string(),
  status: z.string(),
  lastSyncedAt: z.string().nullable(),
  connectedByEmail: z.string().nullable(),
  connectedAt: z.string().nullable(),
  // The last sync's failure message (from lastSyncSummary.error), surfaced so the
  // UI can show WHY a sync failed instead of a generic "Never synced". Null when the
  // last run succeeded or none has run.
  lastError: z.string().nullable(),
});
export type BoardCalendarSourceConfig = z.infer<typeof BoardCalendarSourceConfigSchema>;

// Server-to-server payload for storing a Microsoft Graph calendar connection.
// Carries a user-pasted access token (paste-token flow) and/or a delegated
// refresh token, plus the UPN of the calendar to read. Tokens never reach the
// browser in any config read.
export const SaveCalendarSourceConnectionSchema = z.object({
  accessToken: z.string().trim().min(1).optional(),
  refreshToken: z.string().trim().min(1).optional(),
  calendarUpn: z.string().trim().min(1).optional(),
  connectedByEmail: z.string().trim().min(1).nullable().optional(),
});
export type SaveCalendarSourceConnectionInput = z.infer<typeof SaveCalendarSourceConnectionSchema>;
