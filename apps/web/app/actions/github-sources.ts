'use server';

import { revalidatePath } from 'next/cache';
import type {
  BulkBindRequest,
  BulkBindResponse,
  PickerResponse,
  GitHubPickerError,
} from '@deckgauge/shared';
import { authFetch } from './api';

export async function listGitHubPicker(
  boardId: string,
  query: { instanceId: string; pattern: string; page: number; includeArchived: boolean },
): Promise<PickerResponse | GitHubPickerError> {
  const qs = new URLSearchParams({
    instanceId: query.instanceId,
    pattern: query.pattern,
    page: String(query.page),
    includeArchived: String(query.includeArchived),
  });
  const res = await authFetch(`/api/boards/${boardId}/github/picker?${qs}`);
  if (!res.ok) {
    // Return (don't throw) — server-action throws reach the browser as opaque
    // digests, so the auth/error detail must travel back as a value.
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    return {
      pickerError: true,
      code: body?.error ?? 'error',
      message: body?.message ?? `Could not load repositories from GitHub (${res.status}).`,
      status: res.status,
    };
  }
  return (await res.json()) as PickerResponse;
}

export async function bulkAddGitHubRepos(
  boardId: string,
  req: BulkBindRequest,
): Promise<BulkBindResponse> {
  const res = await authFetch(`/boards/${boardId}/sources/github/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`bulkAddGitHubRepos failed: ${res.status}`);
  const body = (await res.json()) as BulkBindResponse;
  revalidatePath(`/boards/${boardId}/sources`);
  return body;
}

export async function removeGitHubRepo(
  boardId: string,
  boardGitHubSourceId: string,
): Promise<void> {
  const res = await authFetch(
    `/boards/${boardId}/sources/github/${boardGitHubSourceId}`,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`removeGitHubRepo failed: ${res.status}`);
  }
  revalidatePath(`/boards/${boardId}/sources`);
}
