import { developerCommitsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import {
  COMMITS_PER_DEV_TREND_WEEKS,
  formatDateTime,
  resolveWeeks,
} from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

// Commits per developer, unified across GitHub / GitLab / ADO.
//
// Identity is the developer's display name (lower-cased + trimmed), NOT the git
// email: one person frequently commits under several emails (e.g. a corporate
// address and a contractor/personal one), which would otherwise split them into
// multiple rows for the same human. We fall back to author_email as the key only
// when author_name is blank, so unnamed/bot commits don't all collapse into one
// bogus "developer". One output row per person: total commits, summed
// additions/deletions, count of AI-assisted commits, and a per-commit array of
// Monday-aligned week strings the service folds into a weekly trend. `email` is
// a representative address for the person (used as a stable row key + the
// developer_profiles display-name lookup in the service).
export function buildCommitsPerDevSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, COMMITS_PER_DEV_TREND_WEEKS);

  const commits = developerCommitsUnion(scope);
  if (commits.sql === null) return null;

  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH commits AS (${commits.sql})
      SELECT
        any(author_email)                            AS email,
        any(author_name)                             AS name,
        count()                                      AS commits,
        sum(additions)                               AS additions,
        sum(deletions)                               AS deletions,
        countIf(ai_assisted = 1)                     AS ai_commits,
        groupArray(toString(toMonday(committed_at))) AS commit_weeks
      FROM commits
      WHERE committed_at >= {from:DateTime} AND committed_at < {to:DateTime}
      GROUP BY if(trimBoth(author_name) = '', author_email, lowerUTF8(trimBoth(author_name)))
      ORDER BY commits DESC
      LIMIT 100
    `,
    params: { ...commits.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('COMMITS_PER_DEV', buildCommitsPerDevSql);
