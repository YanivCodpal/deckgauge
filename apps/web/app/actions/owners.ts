"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { BoardOwner, CreateOwnerInput, UpdateOwnerInput } from "@deckgauge/shared";
import { apiRequest } from "./api";
import { boardTag } from "../utils/cache-tags";

export async function fetchBoardOwners(boardId: string): Promise<BoardOwner[]> {
  try {
    const res = await apiRequest(`/boards/${boardId}/owners`);
    return res.json();
  } catch {
    return [];
  }
}

export async function createBoardOwner(
  boardId: string,
  data: CreateOwnerInput,
): Promise<BoardOwner> {
  const res = await apiRequest(`/boards/${boardId}/owners`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  revalidateTag(boardTag(boardId));
  return res.json();
}

export async function updateBoardOwner(
  ownerId: string,
  data: UpdateOwnerInput,
  boardId?: string,
): Promise<void> {
  await apiRequest(`/owners/${ownerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}

export async function deleteBoardOwner(ownerId: string, boardId?: string): Promise<void> {
  await apiRequest(`/owners/${ownerId}`, { method: "DELETE" });
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}
