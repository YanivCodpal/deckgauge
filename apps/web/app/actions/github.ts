'use server';

import { authFetch } from './api';

// --- GitHub Instances ---

export async function fetchGitHubInstances() {
  try {
    const res = await authFetch('/github/instances', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createGitHubInstance(data: {
  baseUrl?: string;
  accessToken: string;
  repos?: string[];
}) {
  const res = await authFetch('/github/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create GitHub instance: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function updateGitHubInstance(
  instanceId: string,
  data: { repos?: string[]; accessToken?: string; baseUrl?: string },
) {
  const res = await authFetch(`/github/instances/${instanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update GitHub instance: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function deleteGitHubInstance(instanceId: string): Promise<boolean> {
  try {
    const res = await authFetch(`/github/instances/${instanceId}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testGitHubConnection(
  instanceId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authFetch(`/github/instances/${instanceId}/test`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error ?? `GitHub test failed (${res.status})` };
    }
    return await res.json();
  } catch {
    return { ok: false, error: 'Could not reach API' };
  }
}

export async function discoverGitHubRepos(instanceId: string): Promise<string[]> {
  try {
    const res = await authFetch(`/github/instances/${instanceId}/repos`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.repos ?? [];
  } catch {
    return [];
  }
}

// --- GitHub Sync Configs ---

export async function fetchGitHubSyncConfigs() {
  try {
    const res = await authFetch('/github/sync-configs', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createGitHubSyncConfig(data: {
  githubInstanceId: string;
  repoFullName: string;
  boardId: string;
  targetGroupId?: string | null;
  allowedLabels?: string[];
  allowedTypes?: string[];
  includeClosedIssues?: boolean;
  defaultSyncedFields?: string[];
  projectNodeId?: string | null;
  projectOwner?: string | null;
  projectNumber?: number | null;
  noStatusBoardStatusId?: string | null;
}) {
  const res = await authFetch('/github/sync-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create GitHub sync config: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function updateGitHubSyncConfig(
  id: string,
  data: {
    allowedLabels?: string[];
    includeClosedIssues?: boolean;
    defaultSyncedFields?: string[];
    statusMapping?: Record<string, string>;
    projectNodeId?: string | null;
    projectOwner?: string | null;
    projectNumber?: number | null;
    noStatusBoardStatusId?: string | null;
  },
) {
  const res = await authFetch(`/github/sync-configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update GitHub sync config: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function deleteGitHubSyncConfig(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`/github/sync-configs/${id}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- GitHub Data ---

export async function fetchGitHubMilestones(repoFullName: string) {
  try {
    const res = await authFetch(
      `/github/milestones?repoFullName=${encodeURIComponent(repoFullName)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchGitHubIssues(milestoneId: string) {
  try {
    const res = await authFetch(
      `/github/issues?milestoneId=${encodeURIComponent(milestoneId)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// --- GitHub Sync ---

export async function fetchGitHubSyncStatus() {
  try {
    const res = await authFetch('/github/sync/status', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function triggerGitHubSync(): Promise<boolean> {
  try {
    const res = await authFetch('/github/sync', {
      method: 'POST',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- GitHub Projects v2 ---

export async function listGitHubProjectsAction(instanceId: string) {
  const res = await authFetch(`/github/instances/${instanceId}/projects`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 502 || res.status === 400 || res.status === 404) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Failed to list GitHub Projects: ${res.status}`);
    }
    throw new Error(`Failed to list GitHub Projects: ${res.status}`);
  }
  return (await res.json()) as Array<{
    nodeId: string;
    owner: string;
    number: number;
    title: string;
    ownerType: 'org' | 'user';
  }>;
}

export async function getProjectStatusOptionsAction(syncConfigId: string) {
  const res = await authFetch(`/github/sync-configs/${syncConfigId}/project/status-options`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 502 || res.status === 400 || res.status === 404) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Failed to load Project status options: ${res.status}`);
    }
    throw new Error(`Failed to load Project status options: ${res.status}`);
  }
  return (await res.json()) as Array<{ optionId: string; name: string }>;
}
