'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiRequest, authFetch } from './api';

export interface ComparisonSummary {
  id: string;
  name: string;
  memberCount: number;
}

export interface ComparisonMember {
  boardId: string;
  boardName: string;
  position: number;
}

export interface BoardSummary {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Comparison entity CRUD (standalone — reached through the Comparisons category)
// ---------------------------------------------------------------------------

export async function listComparisons(): Promise<ComparisonSummary[]> {
  try {
    const res = await authFetch('/comparisons', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as ComparisonSummary[]) : [];
  } catch {
    return [];
  }
}

// Single comparison for the /comparison/[id] page. Throws on failure so the
// page can catch → notFound() (a raw throw in a server component surfaces as a
// render error instead of the 404 page).
export async function fetchComparison(id: string): Promise<ComparisonSummary> {
  const session = await auth();
  if (!session) throw new Error('Unauthenticated');
  const res = await authFetch(`/comparisons/${id}`, { revalidate: 0 });
  if (!res.ok) throw new Error(`Failed to fetch comparison (${res.status})`);
  return res.json() as Promise<ComparisonSummary>;
}

export async function createComparison(name: string): Promise<ComparisonSummary> {
  const res = await apiRequest('/comparisons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  revalidatePath('/');
  return res.json() as Promise<ComparisonSummary>;
}

export async function renameComparison(id: string, name: string): Promise<ComparisonSummary> {
  const res = await apiRequest(`/comparisons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  revalidatePath('/');
  return res.json() as Promise<ComparisonSummary>;
}

export async function deleteComparison(id: string): Promise<void> {
  await apiRequest(`/comparisons/${id}`, { method: 'DELETE' });
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Member board set
// ---------------------------------------------------------------------------

// Loads the persisted board set for a comparison, ordered by position.
export async function fetchComparisonMembers(comparisonId: string): Promise<ComparisonMember[]> {
  const res = await apiRequest(`/comparisons/${comparisonId}/members`);
  const json = await res.json();
  return json.members ?? [];
}

// Replaces the full comparison board set (the picker sends the whole ordered
// list). Returns the persisted, re-ordered members.
export async function setComparisonMembers(
  comparisonId: string,
  boardIds: string[]
): Promise<ComparisonMember[]> {
  const res = await apiRequest(`/comparisons/${comparisonId}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardIds }),
  });
  const json = await res.json();
  return json.members ?? [];
}

// Every board the user can pick from for a comparison set.
export async function fetchSelectableBoards(): Promise<BoardSummary[]> {
  const res = await apiRequest('/boards');
  const json = await res.json();
  // The list endpoint returns full board rows; keep just id + name.
  return (Array.isArray(json) ? json : []).map((b: { id: string; name: string }) => ({
    id: b.id,
    name: b.name,
  }));
}
