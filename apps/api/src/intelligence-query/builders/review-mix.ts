import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

// GitHub-only: github_reviews is a github-specific table with no parallel
// table for gitlab/ado today. Returns null when the board has no GitHub
// scope so the service short-circuits with emptyReason='no_github_source'.
//
// Splits first non-comment reviews per (PR, is_bot) and returns BOTH a summary
// row and one row per ISO week in a single UNION ALL — keeping us on the
// single-query BuiltSql contract that every other builder uses.
// `kind` discriminates the two row shapes for the service to fan back out.
export function buildReviewMixSql({ config, scope }: BuilderInputs): BuiltSql | null {
  if (scope.githubRepoFullNames.length === 0) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  // Five UNION ALL branches — kind discriminates the row shape so the service
  // can fan rows back into the typed result. The first four read the
  // first_reviews CTE (non-comment reviews); the fifth ('comments') reads
  // github_reviews directly for the 'commented'-state bot/human split.
  // We use plain `quantile(0.5)(col)` (not the parametric
  // `quantileIf(0.5)(expr, cond)`) because the scope SQL parser only handles
  // the former; per-type medians are computed by WHERE-filtering first_reviews
  // into separate human_p50 and bot_p50 branches.
  const sql = `
    WITH first_reviews AS (
      SELECT
        r.repo_full_name                                                                AS repo_full_name,
        r.pull_request_number                                                           AS pr_number,
        endsWith(r.reviewer_login, '[bot]')                                             AS is_bot,
        min(r.submitted_at)                                                             AS first_review_at,
        any(pr.created_at)                                                              AS pr_created_at
      FROM cockpit.github_reviews AS r
      INNER JOIN cockpit.github_pull_requests AS pr
        ON pr.repo_full_name = r.repo_full_name
       AND pr.number         = r.pull_request_number
      WHERE r.repo_full_name IN {ghRepos:Array(String)}
        AND lower(r.state) != 'commented'
        AND r.submitted_at >= {from:DateTime}
        AND r.submitted_at <  {to:DateTime}
      GROUP BY repo_full_name, pr_number, is_bot
    )
    SELECT
      'summary'                                              AS kind,
      ''                                                     AS week_start,
      toUInt64(count())                                      AS total,
      toUInt64(countIf(is_bot))                              AS bot_count,
      CAST(NULL AS Nullable(Float64))                        AS p50_hours
    FROM first_reviews

    UNION ALL

    SELECT
      'human_p50'                                            AS kind,
      ''                                                     AS week_start,
      toUInt64(0)                                            AS total,
      toUInt64(0)                                            AS bot_count,
      quantile(0.5)(dateDiff('hour', pr_created_at, first_review_at))
                                                             AS p50_hours
    FROM first_reviews
    WHERE NOT is_bot

    UNION ALL

    SELECT
      'bot_p50'                                              AS kind,
      ''                                                     AS week_start,
      toUInt64(0)                                            AS total,
      toUInt64(0)                                            AS bot_count,
      quantile(0.5)(dateDiff('hour', pr_created_at, first_review_at))
                                                             AS p50_hours
    FROM first_reviews
    WHERE is_bot

    UNION ALL

    SELECT
      'weekly'                                               AS kind,
      toString(toMonday(first_review_at))                    AS week_start,
      toUInt64(count())                                      AS total,
      toUInt64(countIf(is_bot))                              AS bot_count,
      CAST(NULL AS Nullable(Float64))                        AS p50_hours
    FROM first_reviews
    GROUP BY week_start

    UNION ALL

    -- Comment share: every 'commented'-state review (the branch the other
    -- metrics exclude), counted per event — bots like Copilot's PR reviewer
    -- review by commenting, so this surfaces their share of review comments.
    SELECT
      'comments'                                             AS kind,
      ''                                                     AS week_start,
      toUInt64(count())                                      AS total,
      toUInt64(countIf(endsWith(r.reviewer_login, '[bot]'))) AS bot_count,
      CAST(NULL AS Nullable(Float64))                        AS p50_hours
    FROM cockpit.github_reviews AS r
    INNER JOIN cockpit.github_pull_requests AS pr
      ON pr.repo_full_name = r.repo_full_name
     AND pr.number         = r.pull_request_number
    WHERE r.repo_full_name IN {ghRepos:Array(String)}
      AND lower(r.state) = 'commented'
      AND r.submitted_at >= {from:DateTime}
      AND r.submitted_at <  {to:DateTime}
  `;

  return {
    sql,
    params: {
      ghRepos: scope.githubRepoFullNames,
      from: formatDateTime(from),
      to: formatDateTime(to),
    },
  };
}

registerBuilder('REVIEW_MIX', buildReviewMixSql);
