'use server';

import type {
  StatusRuleDto,
  TimesheetGridResponse,
  IntervalsResponse,
  CapexReportResponse,
  EpicBreakdownResponse,
} from '@deckgauge/shared';
import { revalidatePath } from 'next/cache';
import { apiRequest } from './api';

// Mirrors the PUT status-rules rule shape from @deckgauge/shared without importing zod.
export interface StatusRuleInput {
  scope: 'ROLE' | 'EMPLOYEE';
  role: string | null;
  employeeId: string | null;
  inProgressStatuses: string[];
}

export async function fetchStatusRules(): Promise<StatusRuleDto[]> {
  try {
    const res = await apiRequest('/timesheet/status-rules');
    return (await res.json()) as StatusRuleDto[];
  } catch {
    return [];
  }
}

export async function saveStatusRules(rules: StatusRuleInput[]): Promise<StatusRuleDto[]> {
  const res = await apiRequest('/timesheet/status-rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules }),
  });
  revalidatePath('/timesheet/status-rules');
  return (await res.json()) as StatusRuleDto[];
}

export interface GridQueryArgs {
  orgTreeId: string;
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  mode: 'normalized' | 'raw';
}

export async function fetchTimesheetGrid(q: GridQueryArgs): Promise<TimesheetGridResponse | null> {
  const params = new URLSearchParams({
    orgTreeId: q.orgTreeId,
    from: q.from,
    to: q.to,
    granularity: q.granularity,
    mode: q.mode,
  });
  try {
    const res = await apiRequest(`/timesheet/grid?${params.toString()}`);
    return (await res.json()) as TimesheetGridResponse;
  } catch {
    return null;
  }
}

export interface IntervalsQueryArgs {
  orgTreeId: string;
  issueKey: string;
  employeeId: string;
  from: string;
  to: string;
}

export async function fetchIntervals(q: IntervalsQueryArgs): Promise<IntervalsResponse> {
  const params = new URLSearchParams({ orgTreeId: q.orgTreeId, issueKey: q.issueKey, employeeId: q.employeeId, from: q.from, to: q.to });
  try {
    const res = await apiRequest(`/timesheet/intervals?${params.toString()}`);
    return (await res.json()) as IntervalsResponse;
  } catch {
    return { issueKey: q.issueKey, employeeId: q.employeeId, intervals: [] };
  }
}

export interface ReportQueryArgs {
  orgTreeId: string;
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  mode: 'normalized' | 'raw';
  groupBy?: 'team' | 'role' | 'person';
}

export async function fetchCapexReport(q: ReportQueryArgs): Promise<CapexReportResponse | null> {
  const params = new URLSearchParams({
    orgTreeId: q.orgTreeId,
    from: q.from,
    to: q.to,
    granularity: q.granularity,
    mode: q.mode,
  });
  if (q.groupBy) params.set('groupBy', q.groupBy);
  try {
    const res = await apiRequest(`/timesheet/capex-report?${params.toString()}`);
    return (await res.json()) as CapexReportResponse;
  } catch {
    return null;
  }
}

export interface EpicBreakdownQueryArgs {
  orgTreeId: string;
  from: string;
  to: string;
  mode: 'normalized' | 'raw';
  limit?: number;
  offset?: number;
}

export async function fetchEpicBreakdown(
  q: EpicBreakdownQueryArgs,
): Promise<EpicBreakdownResponse | null> {
  const params = new URLSearchParams({
    orgTreeId: q.orgTreeId,
    from: q.from,
    to: q.to,
    mode: q.mode,
  });
  if (q.limit != null) params.set('limit', String(q.limit));
  if (q.offset != null) params.set('offset', String(q.offset));
  try {
    const res = await apiRequest(`/timesheet/epic-breakdown?${params.toString()}`);
    return (await res.json()) as EpicBreakdownResponse;
  } catch {
    return null;
  }
}
