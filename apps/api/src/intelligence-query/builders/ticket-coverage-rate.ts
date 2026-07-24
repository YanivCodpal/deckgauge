import { pullRequestsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildTicketCoverageRateSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const prs = pullRequestsUnion(scope);
  if (prs.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH prs AS (${prs.sql}),
      weekly AS (
        SELECT
          toString(toMonday(merged_at))                          AS week_start,
          100 * countIf(length(linked_ticket_keys) > 0) / count() AS coverage_pct
        FROM prs
        WHERE merged_at >= {from:DateTime}
          AND merged_at < {to:DateTime}
          AND state = 'merged'
        GROUP BY week_start
      )
      SELECT * FROM weekly ORDER BY week_start ASC
    `,
    params: { ...prs.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('TICKET_COVERAGE_RATE', buildTicketCoverageRateSql);
