import { issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveDays } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_DAYS = 90;

// Investment allocation: raw per-type counts of issues CLOSED within the
// window, across every issue provider (jira/ado/github via issuesUnion). The
// SQL stays deliberately dumb — GROUP BY the canonical `type` only. Mapping
// each type into an investment category (feature / bug / tech-debt / KTLO /
// other) and computing shares happens in @deckgauge/shared
// (aggregateInvestmentAllocation) so the classification is provider-agnostic
// and unit-tested without ClickHouse.
//
// "Closed in window" is the best available effort proxy: it approximates where
// delivered engineering effort went without needing per-issue time tracking.
export function buildInvestmentAllocationSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const issues = issuesUnion(scope);
  if (issues.sql === null) return null;

  const days = resolveDays((config as { days?: unknown }).days, DEFAULT_DAYS);
  const { from, to } = resolvePeriod(config, Date.now, days);

  return {
    sql: `
      WITH issues AS (${issues.sql})
      SELECT
        type       AS type,
        count()    AS count
      FROM issues
      WHERE closed_at IS NOT NULL
        AND closed_at >= {from:DateTime}
        AND closed_at < {to:DateTime}
      GROUP BY type
      ORDER BY count DESC
    `,
    params: { ...issues.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('INVESTMENT_ALLOCATION', buildInvestmentAllocationSql);
