import { z } from "zod/v4";

export const OWNER_COLORS = [
  "#FF642E", "#FDAB3D", "#FFCB00", "#CAB641",
  "#00C875", "#009AFF", "#579BFC", "#A25DDC",
  "#E44258", "#FF7EB8", "#7F5347", "#C4C4C4",
  "#175A63", "#BDA8F0", "#FF5AC4", "#4ECCC6",
  "#66CCFF", "#7E3B8A", "#BB3354", "#F37021",
] as const;

export const BoardOwnerSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  order: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BoardOwner = z.infer<typeof BoardOwnerSchema>;

export const CreateOwnerInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type CreateOwnerInput = z.infer<typeof CreateOwnerInputSchema>;

export const UpdateOwnerInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
});

export type UpdateOwnerInput = z.infer<typeof UpdateOwnerInputSchema>;
