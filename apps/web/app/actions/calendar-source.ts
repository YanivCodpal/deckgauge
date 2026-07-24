'use server';

import type { BoardCalendarSourceConfig } from '@deckgauge/shared';
import { auth } from '@/auth';
import { apiRequest } from './api';

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function getCalendarSource(
  boardId: string,
): Promise<BoardCalendarSourceConfig | null> {
  try {
    const res = await apiRequest(`/boards/${boardId}/calendar-source`);
    const text = await res.text();
    return text ? (JSON.parse(text) as BoardCalendarSourceConfig) : null;
  } catch {
    return null;
  }
}

export type ConnectCalendarResult =
  | { ok: true; config: BoardCalendarSourceConfig }
  | { ok: false; error: 'unauthorized' | 'invalid_token' | 'save_failed' };

/**
 * Store a user-pasted Microsoft Graph access token + calendar owner UPN for this
 * board. Validates the token by calling Graph /me, then persists it server-to-server
 * (the token never comes back to the browser). Short-lived (~1h) — re-paste to re-sync.
 */
export async function connectCalendarSource(
  boardId: string,
  token: string,
  calendarUpn: string,
): Promise<ConnectCalendarResult> {
  const session = await auth();
  if (!session) return { ok: false, error: 'unauthorized' };

  const accessToken = token.trim();
  if (!accessToken) return { ok: false, error: 'invalid_token' };

  // Validate the token and resolve the connected account (proves it's a Graph token).
  let microsoftUpn = '';
  try {
    const me = await fetch('https://graph.microsoft.com/v1.0/me?$select=userPrincipalName,mail', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!me.ok) return { ok: false, error: 'invalid_token' };
    const j = (await me.json()) as { userPrincipalName?: string; mail?: string };
    microsoftUpn = j.userPrincipalName ?? j.mail ?? '';
  } catch {
    return { ok: false, error: 'invalid_token' };
  }

  const connectedByEmail = (session as { user?: { email?: string | null } })?.user?.email ?? null;
  try {
    const res = await apiRequest(`/boards/${boardId}/calendar-source/connection`, {
      method: 'POST',
      ...json({
        accessToken,
        calendarUpn: calendarUpn.trim() || microsoftUpn || connectedByEmail || undefined,
        connectedByEmail,
      }),
    });
    const config = (await res.json()) as BoardCalendarSourceConfig;
    return { ok: true, config };
  } catch {
    return { ok: false, error: 'save_failed' };
  }
}

/** Disconnect the Microsoft calendar from this board (drops the stored token). */
export async function disconnectCalendarSource(
  boardId: string,
): Promise<BoardCalendarSourceConfig | null> {
  try {
    const res = await apiRequest(`/boards/${boardId}/calendar-source/connection`, {
      method: 'DELETE',
    });
    return (await res.json()) as BoardCalendarSourceConfig;
  } catch {
    return null;
  }
}

/** Mark the calendar source 'syncing'. Ingest worker is a separate later slice. */
export async function syncCalendarSource(boardId: string): Promise<{ enqueued: boolean }> {
  try {
    await apiRequest(`/boards/${boardId}/calendar-source/sync`, { method: 'POST' });
    return { enqueued: true };
  } catch {
    return { enqueued: false };
  }
}
