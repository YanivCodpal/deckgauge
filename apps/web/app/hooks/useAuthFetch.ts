'use client';

import { useSession, getSession } from 'next-auth/react';
import { useCallback } from 'react';
import { useSessionExpired } from '../components/SessionExpiredContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useAuthFetch() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (session as any)?.accessToken as string | undefined;
  const { setSessionExpired } = useSessionExpired();

  const authFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
      });

      if (response.status !== 401) return response;

      // 401 — attempt silent refresh via NextAuth
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refreshed = (await getSession()) as any;

      if (!refreshed?.accessToken || refreshed?.error) {
        setSessionExpired(true);
        return response;
      }

      // Retry once with the new token
      const retryHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
        Authorization: `Bearer ${refreshed.accessToken}`,
      };
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: retryHeaders,
      });

      if (retryResponse.status === 401) {
        setSessionExpired(true);
      }

      return retryResponse;
    },
    [accessToken, setSessionExpired],
  );

  return authFetch;
}
