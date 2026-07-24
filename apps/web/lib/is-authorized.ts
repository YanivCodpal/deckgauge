import type { Session } from 'next-auth';

export function isAuthorized(session: Session | null): boolean {
  if (!session) return false;
  if (session.error === 'RefreshAccessTokenError') return false;
  return true;
}
