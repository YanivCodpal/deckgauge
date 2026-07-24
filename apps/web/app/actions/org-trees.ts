'use server';

import type {
  OrgTreeDto,
  SyncStatus,
  ImportResult,
  OrgEmployeeAliasDto,
  OrgEmployeeDto,
  CreateEmployeeInput,
  UpdateEmployeeProfileInput,
  MoveEmployeeInput,
} from '@deckgauge/shared';
import { apiRequest } from './api';

// Mirrors OrgEmployeeAliasInputSchema from @deckgauge/shared without importing zod.
export interface OrgEmployeeAliasInput {
  provider: 'github' | 'gitlab' | 'ado' | 'jira';
  kind: 'login' | 'email' | 'name';
  value: string;
}

// Mirrors activity response interfaces from the API without importing zod.
export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  url: string | null;
}

export interface EmployeeActivity {
  commits: ActivityItem[];
  pullRequests: ActivityItem[];
  assignedIssues: ActivityItem[];
}

// ---------------------------------------------------------------------------
// Org Trees
// ---------------------------------------------------------------------------

export async function listOrgTrees(): Promise<OrgTreeDto[]> {
  try {
    const res = await apiRequest('/org-trees');
    return (await res.json()) as OrgTreeDto[];
  } catch {
    return [];
  }
}

export async function getOrgTree(id: string): Promise<OrgTreeDto | null> {
  try {
    const res = await apiRequest(`/org-trees/${id}`);
    return (await res.json()) as OrgTreeDto;
  } catch {
    return null;
  }
}

export async function createOrgTree(name: string): Promise<OrgTreeDto> {
  const res = await apiRequest('/org-trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return (await res.json()) as OrgTreeDto;
}

export async function renameOrgTree(id: string, name: string): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-trees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteOrgTree(id: string): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-trees/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export async function triggerOrgTreeSync(id: string): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-trees/${id}/sync`, { method: 'POST' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getOrgTreeSyncStatus(id: string): Promise<SyncStatus | null> {
  try {
    const res = await apiRequest(`/org-trees/${id}/sync-status`);
    return (await res.json()) as SyncStatus;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importOrgChart(
  id: string,
  formData: FormData,
): Promise<ImportResult> {
  // Multipart upload — do NOT set Content-Type; the browser/fetch sets the
  // correct multipart/form-data boundary automatically.
  const res = await apiRequest(`/org-trees/${id}/import`, {
    method: 'POST',
    body: formData,
  });
  return (await res.json()) as ImportResult;
}

// ---------------------------------------------------------------------------
// Employee Aliases
// ---------------------------------------------------------------------------

export async function addEmployeeAlias(
  employeeId: string,
  input: OrgEmployeeAliasInput,
): Promise<OrgEmployeeAliasDto> {
  const res = await apiRequest(`/org-employees/${employeeId}/aliases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await res.json()) as OrgEmployeeAliasDto;
}

export async function deleteEmployeeAlias(aliasId: string): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-employee-aliases/${aliasId}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Employee CRUD + Move
// ---------------------------------------------------------------------------

export async function createEmployee(
  orgTreeId: string,
  input: CreateEmployeeInput,
): Promise<OrgEmployeeDto> {
  const res = await apiRequest(`/org-trees/${orgTreeId}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await res.json()) as OrgEmployeeDto;
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeProfileInput,
): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-employees/${employeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteEmployee(employeeId: string): Promise<{ ok: boolean }> {
  try {
    await apiRequest(`/org-employees/${employeeId}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function moveEmployee(
  employeeId: string,
  input: MoveEmployeeInput,
): Promise<OrgEmployeeDto> {
  const res = await apiRequest(`/org-employees/${employeeId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await res.json()) as OrgEmployeeDto;
}

// ---------------------------------------------------------------------------
// Employee Activity
// ---------------------------------------------------------------------------

export async function getEmployeeActivity(employeeId: string): Promise<EmployeeActivity> {
  try {
    const res = await apiRequest(`/org-employees/${employeeId}/activity`);
    return (await res.json()) as EmployeeActivity;
  } catch {
    return { commits: [], pullRequests: [], assignedIssues: [] };
  }
}
