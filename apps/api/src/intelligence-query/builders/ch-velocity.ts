import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { pullRequestsUnion } from '../../widgets/unions.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildChVelocitySql({ config, scope }: BuilderInputs): BuiltSql | null {
  if (scope.isEmpty) return null;

  const prs = pullRequestsUnion(scope);
  if (!prs.sql) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql})
      SELECT
        toString(toMonday(merged_at)) AS week_start,
        count() AS prs
      FROM prs
      WHERE state = 'merged'
        AND merged_at IS NOT NULL
        AND merged_at >= {from:DateTime}
        AND merged_at < {to:DateTime}
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: {
      ...prs.params,
      from: formatDateTime(from),
      to: formatDateTime(to),
    },
  };
}

registerBuilder('CH_VELOCITY', buildChVelocitySql);
