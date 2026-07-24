import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildReviewPickupTimeSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql})
      SELECT
        toString(toMonday(created_at))                     AS week_start,
        avg(dateDiff('hour', created_at, first_review_at)) AS avg_hours
      FROM prs
      WHERE created_at >= {from:DateTime}
        AND created_at < {to:DateTime}
        AND first_review_at IS NOT NULL
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('REVIEW_PICKUP_TIME', buildReviewPickupTimeSql);
