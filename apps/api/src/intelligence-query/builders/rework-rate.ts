import { commitsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildReworkRateSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const commits = commitsUnion(scope);
  if (commits.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH commits AS (${commits.sql}),
      windowed AS (
        SELECT
          sha, committed_at, author,
          -- Rework = corrective work: a commit whose message signals a fix,
          -- revert, rollback or regression ("corrective commit ratio"). This is
          -- the closest rework signal the commit data supports — per-line churn
          -- (additions/deletions) is not populated for commits, only PRs. The
          -- token is bounded by non-letters ([^a-z]) rather than a regex word
          -- boundary so 'fix' does not match inside 'prefix'/'fixture' and no
          -- backslash escape has to survive the template-literal → ClickHouse
          -- round-trip.
          match(lowerUTF8(message),
            '(^|[^a-z])(revert|rollback|hotfix|bugfix|fixup|fix|fixes|fixed|regression)([^a-z]|$)'
          ) AS is_rework
        FROM commits
        WHERE is_merge_commit = 0
          AND committed_at >= {from:DateTime}
          AND committed_at < {to:DateTime}
      )
      SELECT
        toString(toMonday(committed_at))       AS week_start,
        100 * countIf(is_rework = 1) / count() AS rework_pct
      FROM windowed
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: { ...commits.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('REWORK_RATE', buildReworkRateSql);
