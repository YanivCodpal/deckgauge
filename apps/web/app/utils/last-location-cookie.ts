export const LAST_LOCATION_COOKIE = 'vpc_last_location';

// 1 year in seconds — mirrors the "last viewed board" cookie lifetime.
export const LAST_LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// App "chrome" routes that are their own top-nav destinations (or auth). "Home"
// resumes the last *workspace* location, so these are never recorded: returning
// to Settings/Sources/login when you press Home would be surprising. Everything
// else — boards (/), roadmaps, org trees, timesheets and their sub-views — is
// workspace content worth resuming.
const EXCLUDED_PREFIXES = ['/login', '/settings', '/sources', '/connections'];

/**
 * True when a pathname is a workspace location "Home" should return to.
 * Prefix match is boundary-aware so `/sources` is excluded but a board's own
 * `/boards/<id>/sources` sub-view is not.
 */
export function isResumableLocation(pathname: string): boolean {
  if (!pathname) return false;
  return !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Client-side cookie write (used from "use client" components). The value is a
 * path + optional query (e.g. `/roadmap/abc`, `/timesheet?orgTreeId=xyz`). The
 * cookie carries no auth, so a non-HttpOnly client write is fine.
 */
export function setLastLocationCookie(location: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LAST_LOCATION_COOKIE}=${encodeURIComponent(location)}; Path=/; Max-Age=${LAST_LOCATION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Client-side read of the last workspace location, or null if none recorded. */
export function readLastLocationCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LAST_LOCATION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
