'use server';
import { authFetch } from './api';

export interface JiraProjectSyncRow {
  id: string;
  jiraInstanceId: string;
  jiraProjectKey: string;
  syncChangelog: boolean;
  syncWorklogs: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export async function listJiraProjectSyncs(): Promise<JiraProjectSyncRow[]> {
  const res = await authFetch('/project-syncs/jira', { method: 'GET' });
  if (!res.ok) throw new Error(`list jira project syncs failed: ${res.status}`);
  return res.json();
}

export async function createJiraProjectSync(input: {
  jiraInstanceId: string;
  jiraProjectKey: string;
  syncChangelog: boolean;
  syncWorklogs: boolean;
}) {
  const res = await authFetch('/project-syncs/jira', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteJiraProjectSync(id: string): Promise<void> {
  const res = await authFetch(`/project-syncs/jira/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ---- GitHub ----

// The bulk-repo ingestion model (Task 16) always syncs PRs, reviews, commits,
// workflow runs, deployments, and issues per repo; cadence is governed by
// `tier`. Per-repo syncPrs/syncCommits toggles were removed, so this row mirrors
// what `GET /project-syncs/github` returns — no per-feature flags.
export interface GitHubRepoSyncRow {
  id: string;
  githubInstanceId: string;
  repoFullName: string;
  tier: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export async function listGitHubRepoSyncs(): Promise<GitHubRepoSyncRow[]> {
  const res = await authFetch('/project-syncs/github', { method: 'GET' });
  if (!res.ok) throw new Error(`list github repo syncs failed: ${res.status}`);
  return res.json();
}

export async function createGitHubRepoSync(input: {
  githubInstanceId: string;
  repoFullName: string;
}) {
  const res = await authFetch('/project-syncs/github', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteGitHubRepoSync(id: string): Promise<void> {
  const res = await authFetch(`/project-syncs/github/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ---- Azure DevOps ----

export interface AdoProjectSyncRow {
  id: string;
  azureDevOpsInstanceId: string;
  adoProject: string;
  syncPrs: boolean;
  syncCommits: boolean;
  syncRepos: string[];
  syncAllRepos: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export async function listAdoProjectSyncs(): Promise<AdoProjectSyncRow[]> {
  const res = await authFetch('/project-syncs/ado', { method: 'GET' });
  if (!res.ok) throw new Error(`list ado project syncs failed: ${res.status}`);
  return res.json();
}

export async function createAdoProjectSync(input: {
  azureDevOpsInstanceId: string;
  adoProject: string;
  syncPrs: boolean;
  syncCommits: boolean;
  syncRepos: string[];
  syncAllRepos: boolean;
}) {
  const res = await authFetch('/project-syncs/ado', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateAdoProjectSync(
  id: string,
  patch: { syncPrs?: boolean; syncCommits?: boolean; syncRepos?: string[]; syncAllRepos?: boolean }
) {
  const res = await authFetch(`/project-syncs/ado/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAdoProjectSync(id: string): Promise<void> {
  const res = await authFetch(`/project-syncs/ado/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

// ---- GitLab ----

export interface GitLabProjectSyncRow {
  id: string;
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs: boolean;
  syncCommits: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  boardCount: number;
}

export async function listGitLabProjectSyncs(): Promise<GitLabProjectSyncRow[]> {
  const res = await authFetch('/project-syncs/gitlab', { method: 'GET' });
  if (!res.ok) throw new Error(`list gitlab project syncs failed: ${res.status}`);
  return res.json();
}

export async function createGitLabProjectSync(input: {
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs: boolean;
  syncCommits: boolean;
}) {
  const res = await authFetch('/project-syncs/gitlab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateGitLabProjectSync(
  id: string,
  patch: { syncPrs?: boolean; syncCommits?: boolean }
) {
  const res = await authFetch(`/project-syncs/gitlab/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteGitLabProjectSync(id: string): Promise<void> {
  const res = await authFetch(`/project-syncs/gitlab/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}
