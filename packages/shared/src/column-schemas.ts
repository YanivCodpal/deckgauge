import { z } from "zod/v4";

export const ColumnTypeEnum = z.enum([
  "TEXT",
  "STATUS",
  "DATE",
  "NUMBER",
  "CHECKBOX",
  "DROPDOWN",
  "PERSON",
  "LINK",
]);
export type ColumnType = z.infer<typeof ColumnTypeEnum>;

export const BoardColumnSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string().trim().min(1),
  type: ColumnTypeEnum,
  order: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type BoardColumn = z.infer<typeof BoardColumnSchema>;

export const CreateColumnInputSchema = z.object({
  name: z.string().trim().min(1),
  type: ColumnTypeEnum,
  config: z.record(z.string(), z.unknown()).optional(),
});
export type CreateColumnInput = z.infer<typeof CreateColumnInputSchema>;

export const UpdateColumnInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  order: z.number().int().min(0).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" },
);
export type UpdateColumnInput = z.infer<typeof UpdateColumnInputSchema>;

export const FieldValueSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  columnId: z.string().uuid(),
  value: z.string(),
});
export type FieldValue = z.infer<typeof FieldValueSchema>;

export const UpsertFieldValueInputSchema = z.object({
  columnId: z.string().uuid(),
  value: z.string(),
});
export type UpsertFieldValueInput = z.infer<typeof UpsertFieldValueInputSchema>;

export const UpsertFieldValuesInputSchema = z.array(UpsertFieldValueInputSchema).min(1);

export const BoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Board = z.infer<typeof BoardSchema>;
