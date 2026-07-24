import type { AST } from 'node-sql-parser';
import { collectTableRefs } from './collect-refs.js';
import { getCatalogEntry, type SourceType } from './catalog.js';
import type { ResolvedScope } from './resolve-scope.js';

// ─── Public error class ──────────────────────────────────────────────────────

export class ScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ScopeError';
  }
}

// ─── Internal constants ──────────────────────────────────────────────────────

const SCOPE_KEY: Record<SourceType, keyof ResolvedScope> = {
  github: 'github',
  jira: 'jira',
  ado: 'ado',
  gitlab: 'gitlab',
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Mutate `ast` in place, injecting `<qualifier>.<scopeColumn> IN (<values>)`
 * into the WHERE clause of the immediately-enclosing SELECT for every
 * base-table reference found by `collectTableRefs`.
 *
 * Throws `ScopeError` if:
 *  - `ast` is an array (multi-statement) → code `'MULTI_STATEMENT'`
 *  - a table is not in the catalog → code `'OUT_OF_CATALOG'`
 *  - the matching scope array is empty → code `'EMPTY_SCOPE'`
 */
export function rewriteWithScope(ast: AST | AST[], scope: ResolvedScope): void {
  if (Array.isArray(ast)) {
    throw new ScopeError('Only single SELECT statements are allowed.', 'MULTI_STATEMENT');
  }

  const refs = collectTableRefs(ast);

  for (const ref of refs) {
    const entry = getCatalogEntry(ref.tableName);
    if (!entry) {
      throw new ScopeError(
        `Table '${ref.tableName}' is not available on this board.`,
        'OUT_OF_CATALOG',
      );
    }

    const allowed = scope[SCOPE_KEY[entry.sourceType]];
    if (allowed.length === 0) {
      throw new ScopeError(
        `This board has no ${entry.sourceType} sources attached.`,
        'EMPTY_SCOPE',
      );
    }

    const qualifier = ref.alias ?? ref.tableName;
    injectScopeIn(ref.enclosingSelect, qualifier, entry.scopeColumn, allowed);
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Build a `<qualifier>.<column> IN (<values>)` predicate node using the AST
 * shape that node-sql-parser's postgresql sqlify expects.
 *
 * Key subtleties discovered by inspection:
 *  - `column` must be `{ expr: { type: 'default', value: '<name>' } }`, not a
 *    plain string — sqlify reads that inner shape to emit the column name.
 *  - Single quotes inside string values must be pre-doubled because sqlify
 *    emits `single_quote_string` values verbatim (no escaping pass).
 */
function buildInPredicate(
  qualifier: string,
  column: string,
  values: readonly string[],
): Record<string, unknown> {
  return {
    type: 'binary_expr',
    operator: 'IN',
    left: {
      type: 'column_ref',
      table: qualifier,
      column: { expr: { type: 'default', value: column } },
      collate: null,
    },
    right: {
      type: 'expr_list',
      value: values.map((v) => ({
        type: 'single_quote_string',
        // Pre-double any embedded single quotes so the serializer emits
        // valid SQL (sqlify writes the value verbatim inside '...').
        value: v.replace(/'/g, "''"),
      })),
    },
  };
}

/**
 * Inject a scope predicate into the WHERE clause of a SELECT node.
 * Combines with any existing WHERE via AND (existing condition on the left).
 */
function injectScopeIn(
  selectNode: unknown,
  qualifier: string,
  column: string,
  values: readonly string[],
): void {
  if (selectNode === null || typeof selectNode !== 'object') return;

  const n = selectNode as Record<string, unknown>;
  const predicate = buildInPredicate(qualifier, column, values);

  if (n['where'] !== null && n['where'] !== undefined) {
    n['where'] = {
      type: 'binary_expr',
      operator: 'AND',
      left: n['where'],
      right: predicate,
    };
  } else {
    n['where'] = predicate;
  }
}
