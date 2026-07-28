/**
 * Normalize a GitLab base URL to its REST API root. Users naturally paste the
 * instance web URL (e.g. `https://code.digi.is`), but the REST API lives under
 * `/api/v4`. Without this, requests hit the web UI and 404 — surfacing as "no
 * projects found" during discovery and, in the sync worker, as zero merge
 * requests / commits reaching ClickHouse.
 *
 * Idempotent: a base that already ends in `/api/vN` is returned untouched.
 */
export function gitlabApiBase(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return /\/api\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/api/v4`;
}
