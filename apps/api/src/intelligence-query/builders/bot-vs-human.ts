import { commitsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

// Bot vs Human authorship: of the commits landed on the default branch in the
// period, how many were AI-authored (Claude Code & other assistants, via the
// upstream ai_assisted detector) vs human. Commit-based — not review-based —
// because that is the unit of work actually deployed, and because commit
// trailers (Co-Authored-By: Claude, "Generated with Claude Code") are the
// strongest authorship signal. Multi-source via commitsUnion (github/gitlab/ado).
//
// Emits a summary row + one row per ISO week in a single UNION ALL, matching
// the single-query BuiltSql contract; `kind` discriminates the shapes so the
// service can fan them back out.
export function buildBotVsHumanSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const commits = commitsUnion(scope);
  if (commits.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  // Exclude merge commits: they are attributed to a merge/bot identity and never
  // carry an authorship trailer, so counting them would inflate the human
  // denominator and understate bot share. Matches the same exclusion in
  // rework-rate.ts, which reads the same commitsUnion.
  const sql = `
    WITH commits AS (${commits.sql})
    SELECT
      'summary'                                  AS kind,
      ''                                         AS week_start,
      toUInt64(count())                          AS total,
      toUInt64(countIf(is_ai_assisted = 1))      AS bot_count
    FROM commits
    WHERE committed_at >= {from:DateTime}
      AND committed_at <  {to:DateTime}
      AND is_merge_commit = 0

    UNION ALL

    SELECT
      'weekly'                                   AS kind,
      toString(toMonday(committed_at))           AS week_start,
      toUInt64(count())                          AS total,
      toUInt64(countIf(is_ai_assisted = 1))      AS bot_count
    FROM commits
    WHERE committed_at >= {from:DateTime}
      AND committed_at <  {to:DateTime}
      AND is_merge_commit = 0
    GROUP BY week_start
  `;

  return {
    sql,
    params: { ...commits.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('BOT_VS_HUMAN', buildBotVsHumanSql);
