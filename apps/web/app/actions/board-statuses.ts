"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { BoardStatus, CreateBoardStatusInput, UpdateBoardStatusInput } from "@deckgauge/shared";
import { apiRequest } from "./api";
import { boardTag } from "../utils/cache-tags";

export async function fetchBoardStatuses(boardId: string): Promise<BoardStatus[]> {
  try {
    const res = await apiRequest(`/boards/${boardId}/statuses`);
    return res.json();
  } catch {
    return [];
  }
}

export async function createBoardStatus(
  boardId: string,
  data: CreateBoardStatusInput,
): Promise<BoardStatus> {
  const res = await apiRequest(`/boards/${boardId}/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  revalidateTag(boardTag(boardId));
  return res.json();
}

export async function updateBoardStatus(
  statusId: string,
  data: UpdateBoardStatusInput,
  boardId?: string,
): Promise<void> {
  await apiRequest(`/board-statuses/${statusId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}

export async function deleteBoardStatus(statusId: string, boardId?: string): Promise<void> {
  await apiRequest(`/board-statuses/${statusId}`, { method: "DELETE" });
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}
