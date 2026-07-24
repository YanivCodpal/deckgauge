'use server';

import { authFetch } from './api';

export interface TriggerResult {
  ok: boolean;
  enqueued?: { jira: number; github: number; ado: number; gitlab: number };
  reason?: 'forbidden' | 'queue_unavailable' | 'network' | 'unknown';
}

export interface BoardSyncStatus {
  status: 'IDLE' | 'RUNNING';
  finishedAt: string | null;
  sourceCount: number;
}

export async function triggerBoardSync(boardId: string): Promise<TriggerResult> {
  try {
    const res = await authFetch(`/boards/${boardId}/sync`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (res.status === 403) return { ok: false, reason: 'forbidden' };
    if (res.status === 503) return { ok: false, reason: 'queue_unavailable' };
    if (!res.ok) return { ok: false, reason: 'unknown' };
    const body = (await res.json()) as {
      boardId: string;
      enqueued: { jira: number; github: number; ado: number; gitlab: number };
    };
    return { ok: true, enqueued: body.enqueued };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export async function fetchBoardSyncStatus(boardId: string): Promise<BoardSyncStatus | null> {
  try {
    const res = await authFetch(`/boards/${boardId}/sync/status`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as BoardSyncStatus;
  } catch {
    return null;
  }
}
