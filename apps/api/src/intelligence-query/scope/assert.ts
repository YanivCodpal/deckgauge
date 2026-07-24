import { parseSelect } from './parser.js';
import { collectTableRefs } from './collect-refs.js';
import { getCatalogEntry } from './catalog.js';

export class AssertError extends Error {
  constructor() {
    super('Scope enforcement failed. This is a bug; please report.');
    this.name = 'AssertError';
  }
}

/**
 * Second-line defense: re-parse `sql` (post-rewrite) and assert that every
 * cataloged table reference has its `scopeColumn` in an IN predicate within
 * the nearest enclosing WHERE clause.
 *
 * Throws `AssertError` with a deliberately generic message on any violation
 * so that attackers cannot probe which check caught them.
 */
export function assertEveryRefIsScoped(sql: string): void {
  let parsed: ReturnType<typeof parseSelect>;
  try {
    parsed = parseSelect(sql);
  } catch {
    throw new AssertError();
  }

  if (Array.isArray(parsed.ast)) throw new AssertError();

  const refs = collectTableRefs(parsed.ast);

  for (const ref of refs) {
    const entry = getCatalogEntry(ref.tableName);
    if (!entry) throw new AssertError();

    const selectNode = ref.enclosingSelect as Record<string, unknown> | null;
    if (!containsInOnColumn(selectNode?.['where'], entry.scopeColumn)) {
      throw new AssertError();
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Recursively walk a WHERE-clause AST node looking for a `binary_expr` IN
 * predicate whose left-hand side is a `column_ref` matching `column`.
 * AND nodes are traversed on both branches; all other node types halt the walk.
 */
function containsInOnColumn(node: unknown, column: string): boolean {
  if (node === null || node === undefined || typeof node !== 'object') return false;

  const n = node as Record<string, unknown>;
  if (n['type'] !== 'binary_expr') return false;

  const op = (n['operator'] as string | undefined)?.toUpperCase();

  if (op === 'IN') {
    const left = n['left'] as Record<string, unknown> | undefined;
    return left?.['type'] === 'column_ref' && isMatchingColumn(left, column);
  }

  if (op === 'AND') {
    return (
      containsInOnColumn(n['left'], column) || containsInOnColumn(n['right'], column)
    );
  }

  return false;
}

/**
 * Return true when a `column_ref` node references the given column name
 * (case-insensitive).
 *
 * node-sql-parser represents a re-parsed column name as a plain string in the
 * `column` field. The rewriter (buildInPredicate) injects an in-memory shape
 * of `{ expr: { type: 'default', value: '<name>' } }`, but assertEveryRefIsScoped
 * always operates on freshly-parsed (post-rewrite serialized) SQL, so the plain
 * string branch is the only one exercised at runtime. The structured branch is
 * kept for defensive completeness.
 */
function isMatchingColumn(left: Record<string, unknown>, column: string): boolean {
  const col = left['column'];

  // Common path: node-sql-parser emits a plain string after parsing text SQL.
  if (typeof col === 'string') {
    return col.toLowerCase() === column.toLowerCase();
  }

  // Defensive: in-memory AST from buildInPredicate uses { expr: { type, value } }.
  if (col !== null && typeof col === 'object') {
    const c = col as Record<string, unknown>;
    const expr = c['expr'] as Record<string, unknown> | undefined;
    if (typeof expr?.['value'] === 'string') {
      return (expr['value'] as string).toLowerCase() === column.toLowerCase();
    }
    if (typeof c['value'] === 'string') {
      return (c['value'] as string).toLowerCase() === column.toLowerCase();
    }
  }

  return false;
}
