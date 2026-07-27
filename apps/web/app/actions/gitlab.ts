// EI-030 — GitLab server actions.
'use server';

import type { RemoteProjectsResult } from './board-sources';

interface GitLabInstance {
  id: string;
  name: string;
  baseUrl: string;
  projects: string[];
  createdAt: string;
  updatedAt: string;
}

interface GitLabProjectSync {
  id: string;
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs: boolean;
  syncCommits: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const base = () => process.env.API_URL ?? 'http://api:3001';

export async function fetchGitLabInstances(): Promise<GitLabInstance[]> {
  try {
    const resp = await fetch(`${base()}/gitlab/instances`, { cache: 'no-store' });
    if (!resp.ok) return [];
    return (await resp.json()) as GitLabInstance[];
  } catch {
    return [];
  }
}

export async function createGitLabInstance(input: {
  name: string;
  baseUrl?: string;
  accessToken: string;
  projects: string[];
}): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`${base()}/gitlab/instances`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return { ok: false, message: `API ${resp.status} ${resp.statusText}` };
    return { ok: true, message: 'GitLab instance created.' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteGitLabInstance(id: string): Promise<{ ok: boolean }> {
  try {
    const resp = await fetch(`${base()}/gitlab/instances/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { ok: resp.ok };
  } catch {
    return { ok: false };
  }
}

export async function fetchGitLabProjectSyncs(instanceId?: string): Promise<GitLabProjectSync[]> {
  try {
    const url = instanceId
      ? `${base()}/gitlab/project-syncs?instanceId=${encodeURIComponent(instanceId)}`
      : `${base()}/gitlab/project-syncs`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return [];
    return (await resp.json()) as GitLabProjectSync[];
  } catch {
    return [];
  }
}

export async function createGitLabProjectSync(input: {
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs?: boolean;
  syncCommits?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`${base()}/gitlab/project-syncs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return { ok: false, message: `API ${resp.status} ${resp.statusText}` };
    return { ok: true, message: 'GitLab project sync created.' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function testGitLabConnection(instanceId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch(`${base()}/gitlab/instances/${encodeURIComponent(instanceId)}/test`, { method: 'POST', cache: 'no-store' });
    if (!resp.ok) {
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? `API ${resp.status}` };
    }
    return (await resp.json()) as { ok: boolean; error?: string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createGitLabInstanceReturning(input: {
  name: string;
  baseUrl?: string;
  accessToken: string;
  projects: string[];
}): Promise<{ id: string }> {
  const resp = await fetch(`${base()}/gitlab/instances`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!resp.ok) throw new Error(`create gitlab instance: ${resp.status}`);
  return (await resp.json()) as { id: string };
}

export async function listGitLabRemoteProjects(
  instanceId: string,
  search?: string,
): Promise<RemoteProjectsResult> {
  try {
    const term = search?.trim();
    const url = new URL(`${base()}/gitlab/instances/${encodeURIComponent(instanceId)}/projects`);
    if (term) url.searchParams.set('search', term);
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) {
      const authFailed = resp.status === 401 || resp.status === 403;
      // Surface the API's message (e.g. a base-URL/HTML-parse error) instead of a
      // bare status, so a misconfigured connection is diagnosable from the UI.
      const body = (await resp.json().catch(() => ({}))) as { error?: unknown };
      const detail = typeof body.error === 'string' ? body.error : `Discovery failed (${resp.status})`;
      return { ok: false, authFailed, error: detail };
    }
    const data = (await resp.json()) as { projects?: string[] };
    return { ok: true, projects: data.projects ?? [] };
  } catch {
    return { ok: false, authFailed: false, error: 'Could not reach GitLab.' };
  }
}
