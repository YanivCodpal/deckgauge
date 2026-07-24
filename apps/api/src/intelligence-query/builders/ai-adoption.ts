import { pullRequestsUnion, commitsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

// Monthly or weekly AI-assisted PR% and commit% per period, for one board,
// stitched from two independently-scoped unions (pullRequestsUnion has
// is_ai_assisted; commitsUnion has is_ai_assisted + is_merge_commit).
//
// Both legs are FULL OUTER JOINed on `period` so a period with PR activity
// but no commits (or vice versa) still surfaces a row — COALESCE fills the
// missing side's totals with 0 rather than dropping the period. Detection is
// trailer-based (see unions.ts): absence of the ai_assisted flag does not
// prove the change was human-only, only that no known AI trailer/signal was
// found — the web widget surfaces this caveat to the user.
export function buildAiAdoptionSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  const commits = commitsUnion(scope);
  if (prs.sql === null && commits.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  const bucket = (config as { bucket?: unknown }).bucket === 'month' ? 'month' : 'week';
  const periodExpr = (col: string) =>
    bucket === 'month' ? `toString(toStartOfMonth(${col}))` : `toString(toMonday(${col}))`;

  const prsSql =
    prs.sql === null
      ? null
      : `
    WITH prs AS (${prs.sql})
    SELECT
      ${periodExpr('created_at')}                              AS period,
      round(100 * countIf(is_ai_assisted = 1) / count(), 1)     AS ai_pr_pct,
      toUInt64(count())                                         AS pr_total
    FROM prs
    WHERE created_at >= {from:DateTime}
      AND created_at <  {to:DateTime}
    GROUP BY period
  `;

  const commitsSql =
    commits.sql === null
      ? null
      : `
    WITH commits AS (${commits.sql})
    SELECT
      ${periodExpr('committed_at')}                             AS period,
      round(100 * countIf(is_ai_assisted = 1) / count(), 1)     AS ai_commit_pct,
      toUInt64(count())                                         AS commit_total
    FROM commits
    WHERE NOT is_merge_commit
      AND committed_at >= {from:DateTime}
      AND committed_at <  {to:DateTime}
    GROUP BY period
  `;

  // Both legs present: FULL OUTER JOIN on period so periods with activity on
  // only one leg still surface (COALESCE fills the other leg's numbers with 0).
  // Only one leg present (board scoped to a source lacking one of the two
  // union tables — not possible today since every scope leg backs both PRs
  // and commits, but kept for robustness): emit that leg alone.
  let sql: string;
  let params: Record<string, unknown>;

  if (prsSql !== null && commitsSql !== null) {
    sql = `
      WITH
        pr_periods AS (${prsSql}),
        commit_periods AS (${commitsSql})
      SELECT
        coalesce(pr_periods.period, commit_periods.period)      AS period,
        coalesce(pr_periods.ai_pr_pct, 0)                       AS ai_pr_pct,
        coalesce(commit_periods.ai_commit_pct, 0)               AS ai_commit_pct,
        coalesce(pr_periods.pr_total, 0)                        AS pr_total,
        coalesce(commit_periods.commit_total, 0)                AS commit_total
      FROM pr_periods
      FULL OUTER JOIN commit_periods ON pr_periods.period = commit_periods.period
      ORDER BY period ASC
    `;
    params = { ...prs.params, ...commits.params, from: formatDateTime(from), to: formatDateTime(to) };
  } else if (prsSql !== null) {
    sql = `
      SELECT period, ai_pr_pct, 0 AS ai_commit_pct, pr_total, 0 AS commit_total
      FROM (${prsSql})
      ORDER BY period ASC
    `;
    params = { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) };
  } else {
    sql = `
      SELECT period, 0 AS ai_pr_pct, ai_commit_pct, 0 AS pr_total, commit_total
      FROM (${commitsSql!})
      ORDER BY period ASC
    `;
    params = { ...commits.params, from: formatDateTime(from), to: formatDateTime(to) };
  }

  return { sql, params };
}

registerBuilder('AI_ADOPTION', buildAiAdoptionSql);
