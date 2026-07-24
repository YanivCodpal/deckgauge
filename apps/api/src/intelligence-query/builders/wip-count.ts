import { issuesUnion } from '../../widgets/unions.js';
import { registerBuilder } from './registry.js';
import type { BuilderInputs, BuiltSql } from './types.js';

const DEFAULT_WEEKS = 8;

// Work-in-progress count: per-week count of issues that were created on or
// before week n and not yet closed by the end of week n. ARRAY JOIN over
// range(0, weeks) is ClickHouse's idiomatic way to evaluate the same
// expression across a series of offsets.
//
// Note: the WIP_STATES set is the cross-provider best effort; widgets
// displaying WIP for GitHub-only boards will mostly show zeros since
// GitHub issues have no in-progress state vocabulary.
const WIP_STATES = ['In Progress', 'InProgress', 'Doing', 'Started', 'Active'];

export function buildWipCountSql({ config, scope }: BuilderInputs): BuiltSql | null {
  const issues = issuesUnion(scope);
  if (issues.sql === null) return null;

  const cfgWeeks = (config as { weeks?: unknown }).weeks;
  const weeks = typeof cfgWeeks === 'number' && cfgWeeks > 0 ? cfgWeeks : DEFAULT_WEEKS;

  return {
    sql: `
      WITH issues AS (${issues.sql})
      SELECT
        toString(toMonday(now() - INTERVAL n WEEK)) AS week_start,
        countIf(state IN {wipStates:Array(String)}
                AND created_at <= now() - INTERVAL n WEEK
                AND (closed_at IS NULL OR closed_at > now() - INTERVAL n WEEK)) AS wip
      FROM issues
      ARRAY JOIN range(0, {weeks:UInt32}) AS n
      GROUP BY week_start
      ORDER BY week_start ASC
    `,
    params: { ...issues.params, weeks, wipStates: WIP_STATES },
  };
}

registerBuilder('WIP_COUNT', buildWipCountSql);
