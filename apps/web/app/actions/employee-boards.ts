'use server';

import type {
  EmployeeBoardSummaryDto,
  EmployeeBoardDetailDto,
  CreateEmployeeBoardInput,
  CreateEmployeeGroupInput,
  UpdateEmployeeGroupInput,
  ReorderEmployeeGroupsInput,
  AddNewEmployeeInput,
  MoveMemberInput,
  EmployeeBoardColumnConfig,
  CreateEmployeeColumnInput,
  UpdateEmployeeColumnInput,
} from '@deckgauge/shared';
import { apiRequest } from './api';

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const ok = async (p: Promise<unknown>): Promise<{ ok: boolean }> => {
  try {
    await p;
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

export async function listEmployeeBoards(treeId: string): Promise<EmployeeBoardSummaryDto[]> {
  try {
    const res = await apiRequest(`/org-trees/${treeId}/employee-boards`);
    return (await res.json()) as EmployeeBoardSummaryDto[];
  } catch {
    return [];
  }
}

export async function createEmployeeBoard(
  treeId: string,
  input: CreateEmployeeBoardInput,
): Promise<{ id: string } | null> {
  try {
    const res = await apiRequest(`/org-trees/${treeId}/employee-boards`, { method: 'POST', ...json(input) });
    return (await res.json()) as { id: string };
  } catch {
    return null;
  }
}

export async function getEmployeeBoard(boardId: string): Promise<EmployeeBoardDetailDto | null> {
  try {
    const res = await apiRequest(`/employee-boards/${boardId}`);
    return (await res.json()) as EmployeeBoardDetailDto;
  } catch {
    return null;
  }
}

export async function renameEmployeeBoard(boardId: string, name: string) {
  return ok(apiRequest(`/employee-boards/${boardId}`, { method: 'PATCH', ...json({ name }) }));
}
export async function deleteEmployeeBoard(boardId: string) {
  return ok(apiRequest(`/employee-boards/${boardId}`, { method: 'DELETE' }));
}
export async function createEmployeeGroup(boardId: string, input: CreateEmployeeGroupInput) {
  return ok(apiRequest(`/employee-boards/${boardId}/groups`, { method: 'POST', ...json(input) }));
}
export async function updateEmployeeGroup(groupId: string, input: UpdateEmployeeGroupInput) {
  return ok(apiRequest(`/employee-groups/${groupId}`, { method: 'PATCH', ...json(input) }));
}
export async function deleteEmployeeGroup(groupId: string) {
  return ok(apiRequest(`/employee-groups/${groupId}`, { method: 'DELETE' }));
}
export async function reorderEmployeeGroups(boardId: string, order: ReorderEmployeeGroupsInput['order']) {
  return ok(apiRequest(`/employee-boards/${boardId}/groups/reorder`, { method: 'PATCH', ...json({ order }) }));
}
export async function addExistingMembers(boardId: string, orgEmployeeIds: string[]) {
  return ok(apiRequest(`/employee-boards/${boardId}/members`, { method: 'POST', ...json({ orgEmployeeIds }) }));
}
export async function addNewBoardEmployee(boardId: string, input: AddNewEmployeeInput) {
  return ok(apiRequest(`/employee-boards/${boardId}/employees`, { method: 'POST', ...json(input) }));
}
export async function moveBoardMember(memberId: string, input: MoveMemberInput) {
  return ok(apiRequest(`/employee-board-members/${memberId}/move`, { method: 'PATCH', ...json(input) }));
}
export async function removeBoardMember(memberId: string) {
  return ok(apiRequest(`/employee-board-members/${memberId}`, { method: 'DELETE' }));
}
export async function setEmployeeManager(
  employeeId: string,
  managerId: string | null,
): Promise<{ ok: boolean; cycle?: boolean }> {
  try {
    await apiRequest(`/org-employees/${employeeId}/manager`, { method: 'PATCH', ...json({ managerId }) });
    return { ok: true };
  } catch (e) {
    // apiRequest throws with the HTTP status in the message; surface 409 cycle distinctly.
    return { ok: false, cycle: e instanceof Error && e.message.includes('409') };
  }
}
export async function setEmployeeBoardColumns(boardId: string, config: EmployeeBoardColumnConfig) {
  return ok(apiRequest(`/employee-boards/${boardId}/columns`, { method: 'PATCH', ...json(config) }));
}
export async function createEmployeeColumn(boardId: string, input: CreateEmployeeColumnInput): Promise<{ id: string } | null> {
  try {
    const res = await apiRequest(`/employee-boards/${boardId}/custom-columns`, { method: 'POST', ...json(input) });
    return (await res.json()) as { id: string };
  } catch {
    return null;
  }
}
export async function updateEmployeeColumn(columnId: string, input: UpdateEmployeeColumnInput) {
  return ok(apiRequest(`/employee-columns/${columnId}`, { method: 'PATCH', ...json(input) }));
}
export async function deleteEmployeeColumn(columnId: string) {
  return ok(apiRequest(`/employee-columns/${columnId}`, { method: 'DELETE' }));
}
export async function setEmployeeFieldValue(employeeColumnId: string, orgEmployeeId: string, value: string) {
  return ok(apiRequest('/employee-field-values', { method: 'PUT', ...json({ employeeColumnId, orgEmployeeId, value }) }));
}
export async function appendColumnOption(
  column: { id: string; config: Record<string, unknown> | null },
  value: string,
): Promise<{ ok: boolean }> {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false };
  const existing = Array.isArray(column.config?.options)
    ? (column.config!.options as string[])
    : [];
  if (existing.some((o) => o.toLowerCase() === trimmed.toLowerCase())) return { ok: false };
  const config = { ...(column.config ?? {}), options: [...existing, trimmed] };
  return ok(apiRequest(`/employee-columns/${column.id}`, { method: 'PATCH', ...json({ config }) }));
}
