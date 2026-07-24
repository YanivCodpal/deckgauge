"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type {
  BoardTreeResponse,
  BoardFolderDTO,
  CreateBoardFolderInput,
  UpdateBoardFolderInput,
  UpdateBoardPrefInput,
  BoardKind,
} from "@deckgauge/shared";
import { auth } from "@/auth";
import { apiRequest, authFetch } from "./api";
import { boardTreeTag, boardsListTag, boardTag } from "../utils/cache-tags";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((session as any)?.user?.id as string | undefined) ?? null;
}

async function revalidateTree(): Promise<void> {
  const userId = await currentUserId();
  if (userId) revalidateTag(boardTreeTag(userId));
  else revalidatePath("/");
}

export async function fetchBoardTree(): Promise<BoardTreeResponse> {
  const userId = await currentUserId();
  try {
    const res = await authFetch("/me/board-tree", {
      tags: userId ? [boardTreeTag(userId)] : [],
    });
    if (!res.ok) return { folders: [], prefs: [], roadmaps: [], roadmapPrefs: [] };
    return res.json();
  } catch {
    return { folders: [], prefs: [], roadmaps: [], roadmapPrefs: [] };
  }
}

/** Minimal board fetch — returns just the board `kind`, used to gate kind-specific
 *  UI (e.g. the recruitment calendar source on the Sources tab). Null on any error. */
export async function getBoardKind(boardId: string): Promise<{ kind: string } | null> {
  try {
    const res = await authFetch(`/boards/${boardId}`, { tags: [boardTag(boardId)] });
    if (!res.ok) return null;
    const board = (await res.json()) as { kind?: string | null };
    return { kind: board.kind ?? '' };
  } catch {
    return null;
  }
}

export async function createBoard(
  name: string,
  template?: BoardKind,
): Promise<{ id: string; name: string }> {
  const res = await apiRequest("/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...(template ? { template } : {}) }),
  });
  revalidateTag(boardsListTag());
  await revalidateTree();
  return res.json();
}

export async function createFolder(input: CreateBoardFolderInput): Promise<BoardFolderDTO> {
  const res = await apiRequest("/me/board-folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await revalidateTree();
  return res.json();
}

export async function updateFolder(id: string, input: UpdateBoardFolderInput): Promise<void> {
  await apiRequest(`/me/board-folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await revalidateTree();
}

export async function deleteFolder(id: string): Promise<void> {
  await apiRequest(`/me/board-folders/${id}`, { method: "DELETE" });
  await revalidateTree();
}

export async function updateBoardPref(boardId: string, input: UpdateBoardPrefInput): Promise<void> {
  await apiRequest(`/me/board-prefs/${boardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await revalidateTree();
}
