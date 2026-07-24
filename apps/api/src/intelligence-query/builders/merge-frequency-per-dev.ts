import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { MERGE_FREQ_TREND_WEEKS, formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

export function buildMergeFrequencyPerDevSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, MERGE_FREQ_TREND_WEEKS);

  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql})
      SELECT
        author                                                                               AS author,
        countIf(merged_at >= {from:DateTime} AND merged_at < {to:DateTime} AND state = 'merged')  AS prs_merged,
        groupArray( toString(toMonday(merged_at)) )                                          AS merged_weeks
      FROM prs
      WHERE merged_at >= {from:DateTime} AND merged_at < {to:DateTime} AND state = 'merged'
      GROUP BY author
      ORDER BY prs_merged DESC
      LIMIT 100
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('MERGE_FREQUENCY_PER_DEV', buildMergeFrequencyPerDevSql);
