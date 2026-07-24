import { z } from "zod/v4";

export const CommentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  content: z.unknown(),
  authorName: z.string().min(1),
  authorAvatar: z.string().nullable().default(null),
  pinned: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentInputSchema = z.object({
  content: z.unknown().refine((val) => val !== null && val !== undefined, {
    message: "Content is required",
  }),
  authorName: z.string().min(1).default("VP"),
  uploadIds: z.array(z.string()).optional().default([]),
});

export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export const UpdateCommentInputSchema = z
  .object({
    content: z.unknown().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => data.content !== undefined || data.pinned !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;
