'use server';

import { recordFetch } from "../utils/fetch-stats";
import { getApiUrl, getAuthHeaders } from '../lib/api-server';

export interface AuthFetchOptions extends Omit<RequestInit, 'next'> {
  tags?: string[];
  revalidate?: number | false;
}

export async function authFetch(
  path: string,
  options?: AuthFetchOptions,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const { tags, revalidate, ...init } = options ?? {};
  const headers = { ...authHeaders, ...init.headers };
  const next: { tags?: string[]; revalidate?: number | false } = {};
  if (tags && tags.length > 0) next.tags = tags;
  if (revalidate !== undefined) next.revalidate = revalidate;
  const fetchInit: RequestInit & { next?: typeof next } =
    Object.keys(next).length > 0 ? { ...init, headers, next } : { ...init, headers };
  recordFetch(tags);
  return fetch(`${getApiUrl()}${path}`, fetchInit);
}

export async function apiRequest(
  path: string,
  options?: AuthFetchOptions,
): Promise<Response> {
  const response = await authFetch(path, options);
  if (!response.ok) {
    let details = '';
    try {
      const body = await response.text();
      details = body ? ` - ${body}` : '';
    } catch {
      details = '';
    }
    throw new Error(
      `API request failed (${response.status} ${response.statusText})${details}`,
    );
  }
  return response;
}
