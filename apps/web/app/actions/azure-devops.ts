'use server';

import { authFetch } from './api';

// --- Azure DevOps Instances ---

export async function fetchAzureDevOpsInstances() {
  try {
    const res = await authFetch('/azure-devops/instances', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAzureDevOpsInstance(data: {
  name: string;
  orgUrl: string;
  authMethod: 'PAT' | 'BASIC';
  accessToken: string;
  username?: string | null;
  projects?: string[];
}) {
  const res = await authFetch('/azure-devops/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create Azure DevOps instance: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function updateAzureDevOpsInstance(
  instanceId: string,
  data: { projects: string[] },
) {
  const res = await authFetch(`/azure-devops/instances/${instanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update Azure DevOps instance: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function deleteAzureDevOpsInstance(instanceId: string): Promise<boolean> {
  try {
    const res = await authFetch(`/azure-devops/instances/${instanceId}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testAzureDevOpsConnection(
  instanceId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authFetch(`/azure-devops/instances/${instanceId}/test`, {
      method: 'POST',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false, error: 'Could not reach API' };
  }
}

export async function fetchWorkItemTypes(
  instanceId: string,
  project: string,
): Promise<string[]> {
  try {
    const res = await authFetch(
      `/azure-devops/instances/${instanceId}/work-item-types?project=${encodeURIComponent(project)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.types ?? [];
  } catch {
    return [];
  }
}

// --- Azure DevOps Sync Configs ---

export async function fetchAzureDevOpsSyncConfigs() {
  try {
    const res = await authFetch('/azure-devops/sync-configs', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAzureDevOpsSyncConfig(
  instanceId: string,
  data: {
    adoProject: string;
    boardId: string;
    allowedWorkItemTypes: string[];
    targetGroupId?: string | null;
  },
) {
  const res = await authFetch(`/azure-devops/instances/${instanceId}/sync-configs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, azureDevOpsInstanceId: instanceId }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create Azure DevOps sync config: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function updateAzureDevOpsSyncConfig(
  id: string,
  data: {
    allowedWorkItemTypes?: string[];
    statusMapping?: Record<string, string>;
    defaultSyncedFields?: string[];
  },
) {
  const res = await authFetch(`/azure-devops/sync-configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update Azure DevOps sync config: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function deleteAzureDevOpsSyncConfig(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`/azure-devops/sync-configs/${id}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Azure DevOps Sync ---

export async function fetchAzureDevOpsSyncStatus() {
  try {
    const res = await authFetch('/azure-devops/sync/status', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function triggerAzureDevOpsSync(): Promise<boolean> {
  try {
    const res = await authFetch('/azure-devops/sync', {
      method: 'POST',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Phase 3 project syncs (intelligence) ---

export interface AdoRepoSummary {
  id: string;
  name: string;
  defaultBranch: string | null;
  webUrl: string | null;
}

export async function fetchAzureDevOpsRepositories(
  instanceId: string,
  project: string,
): Promise<AdoRepoSummary[]> {
  try {
    const res = await authFetch(
      `/azure-devops/instances/${instanceId}/repositories?project=${encodeURIComponent(project)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { repositories?: AdoRepoSummary[] };
    return json.repositories ?? [];
  } catch { return []; }
}

export interface AzureDevOpsProjectSyncDto {
  id: string;
  azureDevOpsInstanceId: string;
  adoProject: string;
  syncPrs: boolean;
  syncCommits: boolean;
  syncRepos: string[];
  lastSyncedAt: string | null;
}

export async function fetchAzureDevOpsProjectSyncs(instanceId?: string): Promise<AzureDevOpsProjectSyncDto[]> {
  try {
    const url = instanceId ? `/azure-devops/instances/${instanceId}/project-syncs` : '/azure-devops/project-syncs';
    const res = await authFetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function upsertAzureDevOpsProjectSync(
  instanceId: string,
  data: { adoProject: string; syncPrs: boolean; syncCommits: boolean; syncRepos: string[] },
): Promise<AzureDevOpsProjectSyncDto> {
  const res = await authFetch(`/azure-devops/instances/${instanceId}/project-syncs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to save ADO project sync: ${res.status} ${body}`);
  }
  return await res.json();
}

export async function deleteAzureDevOpsProjectSync(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`/azure-devops/project-syncs/${id}`, { method: 'DELETE', cache: 'no-store' });
    return res.ok;
  } catch { return false; }
}

export async function listAzureDevOpsRemoteProjects(instanceId: string): Promise<string[]> {
  try {
    const res = await authFetch(`/azure-devops/instances/${instanceId}/projects`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { projects?: string[] };
    return data.projects ?? [];
  } catch {
    return [];
  }
}
