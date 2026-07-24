import type { WidgetSqlBuilder } from './types.js';

export const intelligenceQueryBuilders: Record<string, WidgetSqlBuilder> = {};

export function registerBuilder(type: string, builder: WidgetSqlBuilder) {
  if (intelligenceQueryBuilders[type]) {
    throw new Error(`Duplicate intelligence-query builder for widget type ${type}`);
  }
  intelligenceQueryBuilders[type] = builder;
}
