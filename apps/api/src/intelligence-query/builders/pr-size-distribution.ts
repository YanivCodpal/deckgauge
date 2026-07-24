import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildPrSizeDistributionSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql}),
      sized AS (
        SELECT (additions + deletions) AS size
        FROM prs
        WHERE merged_at >= {from:DateTime}
          AND merged_at < {to:DateTime}
          AND state = 'merged'
      )
      SELECT
        multiIf(size < 50,    'XS (<50)',
                size < 250,   'S (<250)',
                size < 500,   'M (<500)',
                size < 1000,  'L (<1000)',
                              'XL (>1000)') AS label,
        count() AS count
      FROM sized
      GROUP BY label
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('PR_SIZE_DISTRIBUTION', buildPrSizeDistributionSql);
