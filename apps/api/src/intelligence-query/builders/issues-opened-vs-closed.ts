import { issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildIssuesOpenedVsClosedSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const issues = issuesUnion(scope);
  if (issues.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH issues AS (${issues.sql}),
      opened AS (
        SELECT toString(toMonday(created_at)) AS week_start, count() AS opened
        FROM issues WHERE created_at >= {from:DateTime} AND created_at < {to:DateTime} GROUP BY week_start
      ),
      closed AS (
        SELECT toString(toMonday(closed_at)) AS week_start, count() AS closed
        FROM issues WHERE closed_at >= {from:DateTime} AND closed_at < {to:DateTime} AND closed_at IS NOT NULL GROUP BY week_start
      )
      SELECT
        ifNull(o.week_start, c.week_start) AS week_start,
        ifNull(o.opened, 0)                AS opened,
        ifNull(c.closed, 0)                AS closed
      FROM opened o FULL OUTER JOIN closed c ON o.week_start = c.week_start
      ORDER BY week_start ASC
    `,
    params: { ...issues.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('ISSUES_OPENED_VS_CLOSED', buildIssuesOpenedVsClosedSql);
