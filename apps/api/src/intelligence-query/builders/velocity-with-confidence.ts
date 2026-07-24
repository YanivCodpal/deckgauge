import { issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';
import { resolveSprints } from '../../widgets/widget-helpers.js';

const DEFAULT_SPRINTS = 8;

export function buildVelocityWithConfidenceSql({ config, scope }: BuilderInputs): BuiltSql | null {
  // Only Jira and ADO carry sprint_name. A GitHub- or GitLab-only scope produces
  // a non-empty issues union, but the sprint aggregation always yields zero rows.
  // Mirror iteration-planning-accuracy: return null and let the caller surface
  // a 'no_sprintable_source' empty reason.
  const hasJira = scope.jiraProjectKeys.length > 0;
  const hasAdo = scope.adoProjects.length > 0;
  if (!hasJira && !hasAdo) return null;

  const issues = issuesUnion(scope);
  if (issues.sql === null) return null;

  const sprints = resolveSprints((config as { sprints?: unknown }).sprints, DEFAULT_SPRINTS);

  return {
    sql: `
      WITH issues AS (${issues.sql}),
      sprint_velocities AS (
        SELECT
          sprint_name,
          countIf(state IN ('Done','Closed','Resolved')) AS completed
        FROM issues
        WHERE sprint_name IS NOT NULL AND sprint_name != ''
        GROUP BY sprint_name
        ORDER BY sprint_name DESC
        LIMIT {sprints:UInt32}
      ),
      stats AS (
        SELECT avg(completed) AS mean, stddevPop(completed) AS sd FROM sprint_velocities
      )
      SELECT
        sv.sprint_name        AS sprint_name,
        sv.completed          AS completed,
        stats.mean - stats.sd AS lower,
        stats.mean + stats.sd AS upper
      FROM sprint_velocities sv, stats
      ORDER BY sv.sprint_name ASC
    `,
    params: { ...issues.params, sprints },
  };
}

registerBuilder('VELOCITY_WITH_CONFIDENCE', buildVelocityWithConfidenceSql);
