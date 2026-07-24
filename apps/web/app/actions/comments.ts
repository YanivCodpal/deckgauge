"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { boardTag, commentsTag } from "../utils/cache-tags";
import { apiRequest } from "./api";

export async function getComments(projectId: string) {
  const res = await apiRequest(`/projects/${projectId}/comments`);
  return res.json();
}

export async function getCommentCounts(
  projectIds: string[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {};
  const res = await apiRequest(
    `/projects/comment-counts?projectIds=${projectIds.join(",")}`,
  );
  return res.json();
}

export async function createComment(
  projectId: string,
  content: unknown,
  uploadIds: string[],
  authorName?: string,
  boardId?: string,
): Promise<void> {
  await apiRequest(`/projects/${projectId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, authorName, uploadIds }),
  });
  revalidateTag(commentsTag(projectId));
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}

export async function updateComment(
  projectId: string,
  commentId: string,
  data: { content?: unknown; pinned?: boolean },
  boardId?: string,
): Promise<void> {
  await apiRequest(`/projects/${projectId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  revalidateTag(commentsTag(projectId));
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}

export async function deleteComment(
  projectId: string,
  commentId: string,
  boardId?: string,
): Promise<void> {
  await apiRequest(`/projects/${projectId}/comments/${commentId}`, {
    method: "DELETE",
  });
  revalidateTag(commentsTag(projectId));
  if (boardId) revalidateTag(boardTag(boardId));
  else revalidatePath("/");
}
