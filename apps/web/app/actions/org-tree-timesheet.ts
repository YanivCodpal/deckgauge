'use server';

import { revalidatePath } from 'next/cache';
import type { OrgTreeTimesheetConfigDto } from '@deckgauge/shared';
import { apiRequest } from './api';

export async function fetchOrgTreeStatusPool(orgTreeId: string): Promise<string[]> {
  try {
    const res = await apiRequest(`/org-trees/${orgTreeId}/timesheet-status-pool`);
    return (await res.json()) as string[];
  } catch {
    return [];
  }
}

export async function fetchOrgTreeTimesheetConfig(
  orgTreeId: string,
): Promise<OrgTreeTimesheetConfigDto | null> {
  try {
    const res = await apiRequest(`/org-trees/${orgTreeId}/timesheet-config`);
    return (await res.json()) as OrgTreeTimesheetConfigDto | null;
  } catch {
    return null;
  }
}

export async function saveOrgTreeTimesheetConfig(
  orgTreeId: string,
  activeStatuses: string[],
  dailyCapHours: number | null,
): Promise<OrgTreeTimesheetConfigDto> {
  const res = await apiRequest(`/org-trees/${orgTreeId}/timesheet-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeStatuses, dailyCapHours }),
  });
  revalidatePath('/settings/timesheet-statuses');
  return (await res.json()) as OrgTreeTimesheetConfigDto;
}
