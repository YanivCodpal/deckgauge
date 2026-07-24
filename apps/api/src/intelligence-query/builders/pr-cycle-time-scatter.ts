import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildPrCycleTimeScatterSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql})
      SELECT
        toString(toDate(merged_at))           AS x,
        cycle_time_hours                      AS y,
        id                                    AS label,
        concat('#', toString(id))             AS href,
        author                                AS author
      FROM prs
      WHERE merged_at IS NOT NULL
        AND merged_at >= {from:DateTime}
        AND merged_at < {to:DateTime}
        AND cycle_time_hours IS NOT NULL
        AND state = 'merged'
      ORDER BY merged_at DESC
      LIMIT 500
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('PR_CYCLE_TIME_SCATTER', buildPrCycleTimeScatterSql);
