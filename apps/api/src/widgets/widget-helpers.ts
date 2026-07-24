// Shared helpers used by widget-data.service.ts and intelligence-query builders.

// The ClickHouse DateTime parser rejects fractional seconds + 'Z' on
// Date.prototype.toISOString() output (code 457). Format manually.
export function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function castRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

// ClickHouse expression that normalizes a status-name column the SAME way the
// shared normalizeStatusName() does (lower-case, collapse runs of whitespace/
// underscore/hyphen to a single space, trim) so a raw `to_status` value can be
// matched against the normalized DONE_STATUS_NAMES param array. Jira changelog
// transitions carry a reliable status *name* but an unreliable *category*
// (always 'Unknown'), so name-based matching is the only way to detect done
// transitions — see packages/shared status-rules.ts. Centralized here so the
// regex-escaping (double backslash survives into the emitted SQL) lives once.
export function chNormalizedStatusExpr(column: string): string {
  return `trimBoth(replaceRegexpAll(lowerUTF8(${column}), '[\\\\s_-]+', ' '))`;
}

export const MERGE_FREQ_TREND_WEEKS = 8;
export const COMMITS_PER_DEV_TREND_WEEKS = 12;

// Monday-aligned start of the week containing `d`, in UTC. Matches the
// semantics of ClickHouse's toMonday() so JS-side bucketing of `week_start`
// strings stays consistent across providers.
function getUtcMondayOf(d: Date): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  const daysBack = (m.getUTCDay() + 6) % 7;
  m.setUTCDate(m.getUTCDate() - daysBack);
  return m;
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Builds the canonical N-week trend window (oldest first, current week last)
// of Monday-aligned date strings, anchored to "now".
export function buildTrendWeekBuckets(now: Date, weeks: number): string[] {
  const monday = getUtcMondayOf(now);
  const buckets: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.push(formatUtcDate(d));
  }
  return buckets;
}

// Reads a positive integer `weeks` from an opaque widget config, falling back
// to the widget's documented default when missing, non-numeric, or non-positive.
export function resolveWeeks(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && raw > 0 ? raw : fallback;
}

// Reads a positive integer `days` from an opaque widget config, falling back
// to the widget's documented default when missing, non-numeric, or non-positive.
export function resolveDays(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && raw > 0 ? raw : fallback;
}

// Reads a positive integer `sprints` from an opaque widget config, falling back
// to the widget's documented default when missing, non-numeric, or non-positive.
export function resolveSprints(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && raw > 0 ? raw : fallback;
}

// Fixed ordering for backlog age buckets. Used by getChBacklogAge widget.
export const BACKLOG_AGE_BUCKETS = [
  { label: '0-7d', minDays: 0, maxDays: 7 },
  { label: '7-30d', minDays: 7, maxDays: 30 },
  { label: '30-90d', minDays: 30, maxDays: 90 },
  { label: '90d+', minDays: 90, maxDays: null as number | null },
] as const;

// Fixed ordering + tier per bucket label. Tier reflects industry guidance that
// small PRs (≤250 LOC) review fastest and have lower defect rates.
// Used by getPrSizeDistribution widget and buildPrSizeDistributionSql builder.
export const PR_SIZE_BUCKETS: ReadonlyArray<{ label: string; tier: 'elite' | 'high' | 'medium' | 'low' }> = [
  { label: 'XS (<50)', tier: 'elite' },
  { label: 'S (<250)', tier: 'elite' },
  { label: 'M (<500)', tier: 'high' },
  { label: 'L (<1000)', tier: 'medium' },
  { label: 'XL (>1000)', tier: 'low' },
];
