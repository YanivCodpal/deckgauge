import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';

export function buildChBacklogAgeSql({ scope }: BuilderInputs): BuiltSql | null {
  if (scope.isEmpty || scope.jiraProjectKeys.length === 0) return null;

  return {
    sql: `
      SELECT
        multiIf(
          age_days < 7,  '0-7d',
          age_days < 30, '7-30d',
          age_days < 90, '30-90d',
          '90d+'
        ) AS bucket,
        count() AS count
      FROM (
        SELECT dateDiff('day', created_at, now()) AS age_days
        FROM cockpit.jira_issues
        WHERE project_key IN {projects:Array(String)}
          AND status_category != 'Done'
      )
      GROUP BY bucket
    `,
    params: {
      projects: scope.jiraProjectKeys,
    },
  };
}

registerBuilder('CH_BACKLOG_AGE', buildChBacklogAgeSql);
