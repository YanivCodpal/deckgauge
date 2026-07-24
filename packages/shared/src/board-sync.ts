import { z } from 'zod';

export const BoardSyncEnqueueResponseSchema = z.object({
  boardId: z.string().uuid(),
  enqueued: z.object({
    jira: z.number().int().min(0),
    github: z.number().int().min(0),
    ado: z.number().int().min(0),
    gitlab: z.number().int().min(0),
  }),
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
