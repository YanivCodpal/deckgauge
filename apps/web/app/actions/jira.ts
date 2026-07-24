'use server';

import { authFetch } from './api';

// --- Jira Instances ---

export async function fetchJiraInstances() {
  try {
    const res = await authFetch('/jira/instances', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createJiraInstance(data: {
  name: string;
  atlassianUrl: string;
  email: string;
  apiToken: string;
  projectKeys: string[];
}) {
  const res = await authFetch('/jira/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create Jira instance: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function testJiraConnection(instanceId: string) {
  try {
    const res = await authFetch(`/jira/instances/${instanceId}/test`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function discoverJiraProjects(instanceId: string) {
  try {
    const res = await authFetch(
      `/jira/instances/${instanceId}/projects`,
      { method: 'POST', cache: 'no-store' },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateJiraInstance(
  instanceId: string,
  data: { projectKeys: string[] },
) {
  const res = await authFetch(`/jira/instances/${instanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update Jira instance: ${res.status} ${body}`);
  }
}

export async function deleteJiraInstance(
  instanceId: string,
): Promise<boolean> {
  try {
    const res = await authFetch(`/jira/instances/${instanceId}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Board Statuses ---

export interface BoardStatusOption {
  id: string;
  label: string;
  color: string;
}

export async function fetchBoardStatuses(boardId: string): Promise<BoardStatusOption[]> {
  try {
    const res = await authFetch(`/boards/${boardId}/statuses`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// --- Boards ---

export async function fetchBoards() {
  try {
    const res = await authFetch('/boards', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// --- Sync Configs ---

export async function fetchAllSyncConfigs() {
  const res = await authFetch('/sync-configs', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch sync configs');
  return res.json();
}

export async function fetchIssueTypes(
  instanceId: string,
  projectKey: string,
): Promise<string[]> {
  try {
    const res = await authFetch(
      `/jira/instances/${instanceId}/projects/${encodeURIComponent(projectKey)}/issue-types`,
    );
    if (!res.ok) return [];
    return res.json() as Promise<string[]>;
  } catch {
    return [];
  }
}

export async function fetchSyncConfigs(boardId: string) {
  const res = await authFetch(`/boards/${boardId}/sync-configs`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch sync configs');
  return res.json();
}

export async function createSyncConfig(data: {
  boardId: string;
  jiraInstanceId: string;
  jiraProjectKey: string;
  allowedIssueTypes: string[];
  statusMapping?: Record<string, string>;
}): Promise<{ syncConfig: Record<string, unknown>; syncJobId: string | undefined }> {
  const res = await authFetch('/sync-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create sync config');
  return res.json();
}

export async function updateSyncConfig(
  id: string,
  data: {
    allowedIssueTypes?: string[];
    fieldMappings?: Record<string, string>;
    defaultSyncedFields?: string[];
    statusMapping?: Record<string, string>;
  },
) {
  const res = await authFetch(`/sync-configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update sync config');
  return res.json();
}

export async function deleteSyncConfig(id: string) {
  const res = await authFetch(`/sync-configs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete sync config');
}
