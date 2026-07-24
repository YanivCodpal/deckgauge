import { pullRequestsUnion, commitsUnion, issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

// Corrective-commit signal, reused verbatim from rework-rate.ts so Change
// Failure Rate and Rework Rate stay consistent. Token bounded by [^a-z] (not a
// regex word boundary) so 'fix' doesn't match inside 'prefix'/'fixture'.
const CORRECTIVE_RE =
  '(^|[^a-z])(revert|rollback|hotfix|bugfix|fixup|fix|fixes|fixed|regression)([^a-z]|$)';

// DORA scorecard, single round-trip. Each metric column is computed by a
// subquery over the union it needs, and falls back to NULL when that source is
// absent — so a Jira-only board still gets Time-to-Restore, a GitHub-only board
// still gets the speed + change-failure metrics, etc. Returns null only when the
// board has NO source at all.
//
// PROXIES (no deployment/incident source exists yet):
//   lead_time_hours    = p50 cycle time of merged PRs
//   deploys            = count of merged PRs (÷ weeks → per-week rate in service)
//   corrective/total   = corrective-commit ratio → Change Failure Rate
//   ttr_hours          = p50 hours bug-issue opened → closed
export function buildDoraMetricsSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  const commits = commitsUnion(scope);
  const issues = issuesUnion(scope);
  if (prs.sql === null && commits.sql === null && issues.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  const leadTimeCol = prs.sql
    ? `(SELECT quantile(0.5)(cycle_time_hours) FROM (${prs.sql})
         WHERE merged_at IS NOT NULL AND merged_at >= {from:DateTime} AND merged_at < {to:DateTime}
           AND cycle_time_hours IS NOT NULL AND state = 'merged')`
    : `CAST(NULL AS Nullable(Float64))`;

  const deploysCol = prs.sql
    ? `(SELECT count() FROM (${prs.sql})
         WHERE merged_at IS NOT NULL AND merged_at >= {from:DateTime} AND merged_at < {to:DateTime}
           AND state = 'merged')`
    : `CAST(NULL AS Nullable(UInt64))`;

  const correctiveCol = commits.sql
    ? `(SELECT countIf(match(lowerUTF8(message), '${CORRECTIVE_RE}')) FROM (${commits.sql})
         WHERE is_merge_commit = 0 AND committed_at >= {from:DateTime} AND committed_at < {to:DateTime})`
    : `CAST(NULL AS Nullable(UInt64))`;

  const totalCommitsCol = commits.sql
    ? `(SELECT count() FROM (${commits.sql})
         WHERE is_merge_commit = 0 AND committed_at >= {from:DateTime} AND committed_at < {to:DateTime})`
    : `CAST(NULL AS Nullable(UInt64))`;

  const ttrCol = issues.sql
    ? `(SELECT quantile(0.5)(dateDiff('hour', created_at, closed_at)) FROM (${issues.sql})
         WHERE closed_at IS NOT NULL AND closed_at >= {from:DateTime} AND closed_at < {to:DateTime}
           AND match(lowerUTF8(type), '(bug|defect|incident|hotfix)'))`
    : `CAST(NULL AS Nullable(Float64))`;

  return {
    sql: `SELECT
        ${leadTimeCol}     AS lead_time_hours,
        ${deploysCol}      AS deploys,
        ${correctiveCol}   AS corrective_commits,
        ${totalCommitsCol} AS total_commits,
        ${ttrCol}          AS ttr_hours`,
    // Union params share identical keys+values (same scope arrays), so merging
    // is safe — e.g. {ghRepos} appears in the PR, commit and issue subqueries.
    params: {
      ...prs.params,
      ...commits.params,
      ...issues.params,
      from: formatDateTime(from),
      to: formatDateTime(to),
    },
  };
}

registerBuilder('DORA_METRICS', buildDoraMetricsSql);
