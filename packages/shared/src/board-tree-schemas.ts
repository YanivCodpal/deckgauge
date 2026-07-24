import { z } from 'zod';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_FOLDER_COLOR = '#6366F1';

// ---- DB row shapes (server → client) ----
export const BoardFolderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  color: z.string().regex(HEX_COLOR),
  position: z.number(),
  isExpanded: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BoardFolderDTO = z.infer<typeof BoardFolderSchema>;

export const UserBoardPrefSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  boardId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  position: z.number(),
  isFavorite: z.boolean(),
  isHidden: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type UserBoardPrefDTO = z.infer<typeof UserBoardPrefSchema>;

export const UserRoadmapPrefSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  roadmapId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
  position: z.number(),
  isFavorite: z.boolean(),
  isHidden: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type UserRoadmapPrefDTO = z.infer<typeof UserRoadmapPrefSchema>;

export const BoardTreeResponseSchema = z.object({
  folders: z.array(BoardFolderSchema),
  prefs: z.array(UserBoardPrefSchema),
  boards: z.array(z.object({ id: z.string().uuid(), name: z.string() })).optional(),
  roadmaps: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  roadmapPrefs: z.array(UserRoadmapPrefSchema),
});
export type BoardTreeResponse = z.infer<typeof BoardTreeResponseSchema>;

// ---- Mutation inputs (client → server) ----
export const CreateBoardFolderInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(HEX_COLOR).default(DEFAULT_FOLDER_COLOR),
  parentId: z.string().uuid().nullish(),
  position: z.number().optional(),
});
export type CreateBoardFolderInput = z.infer<typeof CreateBoardFolderInputSchema>;

export const UpdateBoardFolderInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    color: z.string().regex(HEX_COLOR).optional(),
    parentId: z.string().uuid().nullish(), // reparent; null = move to top level
    position: z.number().optional(),
    isExpanded: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateBoardFolderInput = z.infer<typeof UpdateBoardFolderInputSchema>;

export const UpdateBoardPrefInputSchema = z
  .object({
    folderId: z.string().uuid().nullish(), // null = unfile (top level)
    position: z.number().optional(),
    isFavorite: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateBoardPrefInput = z.infer<typeof UpdateBoardPrefInputSchema>;

export const UpdateRoadmapPrefInputSchema = z
  .object({
    folderId: z.string().uuid().nullish(), // null = unfile (top level)
    position: z.number().optional(),
    isFavorite: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateRoadmapPrefInput = z.infer<typeof UpdateRoadmapPrefInputSchema>;

// ---- Assembled render tree (output of buildBoardTree) ----
export interface BoardSummary {
  id: string;
  name: string;
}

export interface RoadmapSummary {
  id: string;
  name: string;
}

export interface BoardNodeData {
  kind: 'board';
  id: string;
  name: string;
  position: number;
  isFavorite: boolean;
  folderId: string | null;
}

export interface RoadmapNodeData {
  kind: 'roadmap';
  id: string;
  name: string;
  position: number;
  isFavorite: boolean;
  folderId: string | null;
}

export interface FolderNodeData {
  kind: 'folder';
  id: string;
  name: string;
  color: string;
  isExpanded: boolean;
  position: number;
  children: SidebarNode[];
}

export type SidebarNode = FolderNodeData | BoardNodeData | RoadmapNodeData;

export interface BoardTree {
  favorites: (BoardNodeData | RoadmapNodeData)[]; // favorited, not hidden
  tree: SidebarNode[]; // top-level folders + unfiled boards + unfiled roadmaps
  hidden: (BoardNodeData | RoadmapNodeData)[]; // hidden boards and roadmaps
}
