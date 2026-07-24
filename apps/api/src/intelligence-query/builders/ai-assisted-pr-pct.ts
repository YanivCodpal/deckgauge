import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildAiAssistedPrPctSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql})
      SELECT
        toString(toMonday(merged_at))               AS week_start,
        100 * countIf(is_ai_assisted = 1) / count() AS ai_pct,
        toUInt64(countIf(is_ai_assisted = 1))       AS ai_count,
        toUInt64(count())                           AS pr_total
      FROM prs
      WHERE merged_at >= {from:DateTime}
        AND merged_at < {to:DateTime}
        AND state = 'merged'
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('AI_ASSISTED_PR_PCT', buildAiAssistedPrPctSql);
