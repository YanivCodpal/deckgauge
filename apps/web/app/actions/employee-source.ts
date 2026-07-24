'use server';

import { revalidatePath } from 'next/cache';
import type { OrgSourceConfig } from '@deckgauge/shared';
import { auth } from '@/auth';
import { apiRequest } from './api';

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function getOrgSource(treeId: string): Promise<OrgSourceConfig | null> {
  try {
    const res = await apiRequest(`/org-trees/${treeId}/source`);
    return (await res.json()) as OrgSourceConfig;
  } catch {
    return null;
  }
}

export async function saveOrgSource(
  treeId: string,
  rootUpn: string,
): Promise<OrgSourceConfig | null> {
  try {
    const res = await apiRequest(`/org-trees/${treeId}/source`, {
      method: 'PUT',
      ...json({ rootUpn }),
    });
    const data = (await res.json()) as OrgSourceConfig;
    revalidatePath(`/org/${treeId}`);
    return data;
  } catch {
    return null;
  }
}

export async function triggerOrgSourceSync(treeId: string): Promise<{ enqueued: boolean }> {
  try {
    await apiRequest(`/org-trees/${treeId}/source/sync`, { method: 'POST' });
    revalidatePath(`/org/${treeId}`);
    return { enqueued: true };
  } catch {
    return { enqueued: false };
  }
}

/** Disconnect the Microsoft account from this tree (drops the stored token). */
export async function disconnectOrgSource(treeId: string): Promise<OrgSourceConfig | null> {
  try {
    const res = await apiRequest(`/org-trees/${treeId}/source/connection`, { method: 'DELETE' });
    const data = (await res.json()) as OrgSourceConfig;
    revalidatePath(`/org/${treeId}`);
    return data;
  } catch {
    return null;
  }
}

export type SaveGraphTokenResult =
  | { ok: true; config: OrgSourceConfig }
  | { ok: false; error: 'unauthorized' | 'invalid_token' | 'save_failed' };

/**
 * Store a user-pasted Microsoft Graph access token for this tree (no app
 * registration). Validates the token by calling Graph /me, captures the connected
 * account, then persists it server-to-server (the token never comes back to the
 * browser in any config read). The token is short-lived (~1h) — re-paste to re-sync.
 */
export async function saveGraphToken(
  treeId: string,
  token: string,
): Promise<SaveGraphTokenResult> {
  const session = await auth();
  if (!session) return { ok: false, error: 'unauthorized' };

  const accessToken = token.trim();
  if (!accessToken) return { ok: false, error: 'invalid_token' };

  // Validate the token and resolve the connected account (also proves it's a Graph token).
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
    const res = await apiRequest(`/org-trees/${treeId}/source/connection`, {
      method: 'POST',
      ...json({
        accessToken,
        microsoftUpn: microsoftUpn || connectedByEmail || 'unknown',
        connectedByEmail,
      }),
    });
    const config = (await res.json()) as OrgSourceConfig;
    revalidatePath(`/org/${treeId}`);
    return { ok: true, config };
  } catch {
    return { ok: false, error: 'save_failed' };
  }
}
