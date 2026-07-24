// apps/web/app/actions/presets.ts
'use server';
import { revalidateTag } from 'next/cache';
import { authFetch } from './api';
import { boardTag } from '../utils/cache-tags';

export interface ApplyPresetResult {
  /** True when the preset was already applied (API returned 409). */
  alreadyApplied: boolean;
  viewId?: string;
  widgetCount?: number;
}

export async function applyPreset(
  boardId: string,
  presetKey: string
): Promise<ApplyPresetResult> {
  const resp = await authFetch(`/boards/${encodeURIComponent(boardId)}/views/apply-preset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ presetKey }),
  });

  // 409 = the preset view already exists on this board. This is a benign,
  // idempotent outcome (not an error): the view is there, so revalidate the
  // board and report it back so the UI can refresh and hide the apply banner.
  if (resp.status === 409) {
    revalidateTag(boardTag(boardId));
    return { alreadyApplied: true };
  }

  if (!resp.ok) throw new Error(`apply-preset failed: ${resp.status}`);

  const data = (await resp.json()) as { viewId: string; widgetCount: number };
  revalidateTag(boardTag(boardId));
  return { alreadyApplied: false, ...data };
}
