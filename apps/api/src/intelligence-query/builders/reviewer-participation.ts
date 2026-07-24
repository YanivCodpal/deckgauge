import { reviewsUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { formatDateTime, resolveWeeks } from '../../widgets/widget-helpers.js';
import { resolvePeriod } from './period.js';

const DEFAULT_WEEKS = 12;

// Per-reviewer review load + approvals across github_reviews ∪ ado_reviews.
// Bots excluded (human review-load metric); each reviewer is single-provider
// (disjoint handle vs UPN namespaces), so any(provider) is unambiguous.
export function buildReviewerParticipationSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const reviews = reviewsUnion(scope);
  if (reviews.sql === null) return null;

  const weeks = resolveWeeks((config as { weeks?: unknown }).weeks, DEFAULT_WEEKS);
  const { from, to } = resolvePeriod(config, Date.now, weeks * 7);

  return {
    sql: `
      WITH reviews AS (${reviews.sql})
      SELECT
        reviewer                              AS reviewer,
        any(provider)                         AS provider,
        toUInt64(count())                     AS reviews_given,
        toUInt64(countIf(is_approval))        AS approvals
      FROM reviews
      WHERE NOT is_bot
        AND submitted_at >= {from:DateTime}
        AND submitted_at <  {to:DateTime}
      GROUP BY reviewer
      ORDER BY reviews_given DESC
      LIMIT 100
    `,
    params: { ...reviews.params, from: formatDateTime(from), to: formatDateTime(to) },
  };
}

registerBuilder('REVIEWER_PARTICIPATION', buildReviewerParticipationSql);
