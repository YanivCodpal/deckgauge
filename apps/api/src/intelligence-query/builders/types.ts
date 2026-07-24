import type { BoardScope } from '../../intelligence/board-scope.js';

export interface BuilderInputs {
  config: Record<string, unknown>;
  scope: BoardScope;
}

export interface BuiltSql {
  sql: string;
  params: Record<string, unknown>;
}

export type WidgetSqlBuilder = (inputs: BuilderInputs) => BuiltSql | null;
// Returns null when the widget cannot run (e.g., empty required scope) — caller
// short-circuits with an empty payload.
