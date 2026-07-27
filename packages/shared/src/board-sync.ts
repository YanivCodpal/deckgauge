import { z } from 'zod';

export const SourceHealthStateSchema = z.enum(['valid', 'expired', 'unreachable']);
export type SourceHealthState = z.infer<typeof SourceHealthStateSchema>;

export const BoardSourceHealthSchema = z.object({
  provider: z.enum(['jira', 'github', 'ado', 'gitlab']),
  instanceId: z.string(),
  label: z.string(),
  state: SourceHealthStateSchema,
  error: z.string().optional(),
});
export type BoardSourceHealth = z.infer<typeof BoardSourceHealthSchema>;

export const BoardSourceHealthResponseSchema = z.object({
  sources: z.array(BoardSourceHealthSchema),
  hasExpired: z.boolean(),
});
export type BoardSourceHealthResponse = z.infer<typeof BoardSourceHealthResponseSchema>;

export const BoardSyncEnqueueResponseSchema = z.object({
  boardId: z.string().uuid(),
  enqueued: z.object({
    jira: z.number().int().min(0),
    github: z.number().int().min(0),
    ado: z.number().int().min(0),
    gitlab: z.number().int().min(0),
  }),
  expired: z.array(BoardSourceHealthSchema).default([]),
});
export type BoardSyncEnqueueResponse = z.infer<
  typeof BoardSyncEnqueueResponseSchema
>;

export const BoardSyncStatusResponseSchema = z.object({
  status: z.enum(['IDLE', 'RUNNING']),
  finishedAt: z.string().datetime().nullable(),
  sourceCount: z.number().int().min(0),
});
export type BoardSyncStatusResponse = z.infer<
  typeof BoardSyncStatusResponseSchema
>;
