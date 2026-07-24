'use server';

import { revalidateTag } from 'next/cache';
import { apiRequest } from './api';
import { boardTag } from '../utils/cache-tags';

export async function fetchViews(boardId: string) {
  const res = await apiRequest(`/boards/${boardId}/views`);
  return res.json();
}

export async function createView(boardId: string, data: { type: string; name: string }) {
  const res = await apiRequest(`/boards/${boardId}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  revalidateTag(boardTag(boardId));
  return res.json();
}

export async function updateView(
  boardId: string,
  viewId: string,
  data: { name?: string; position?: number }
) {
  const res = await apiRequest(`/boards/${boardId}/views/${viewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  revalidateTag(boardTag(boardId));
  return res.json();
}

export async function deleteView(boardId: string, viewId: string) {
  await apiRequest(`/boards/${boardId}/views/${viewId}`, { method: 'DELETE' });
  revalidateTag(boardTag(boardId));
}
