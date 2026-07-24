import { issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

export function buildBugRateSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const issues = issuesUnion(scope);
  if (issues.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH issues AS (${issues.sql})
      SELECT
        toString(toMonday(created_at))                    AS week_start,
        countIf(lowerUTF8(type) IN ('bug', 'defect'))     AS bugs,
        countIf(lowerUTF8(type) NOT IN ('bug', 'defect')) AS other
      FROM issues
      WHERE created_at >= {from:DateTime}
        AND created_at < {to:DateTime}
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: { ...issues.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('BUG_RATE', buildBugRateSql);
