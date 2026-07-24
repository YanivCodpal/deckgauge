import type { AST } from 'node-sql-parser';

export interface TableRef {
  /** Base table name, lowercased. */
  tableName: string;
  /** Query alias (`AS foo`), or null when no alias is given. */
  alias: string | null;
  /** The SELECT AST node whose FROM clause contains this reference.
   *  The rewriter will inject scope predicates into this node's WHERE. */
  enclosingSelect: unknown;
}

/**
 * Walk a parsed SQL AST and return every base-table reference found,
 * including those inside subqueries, CTEs, and UNION branches.
 *
 * CTE alias references in outer SELECTs are skipped — they are not base
 * tables and do not need scope injection.
 *
 * Multi-statement arrays (e.g. `SELECT 1; SELECT 2`) are defensively
 * rejected by returning an empty array; the validator rejects them before
 * we reach this point in normal operation.
 */
export function collectTableRefs(ast: AST | AST[]): TableRef[] {
  if (Array.isArray(ast)) return [];

  const refs: TableRef[] = [];
  walkSelect(ast, new Set<string>(), refs);
  return refs;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type SelectNode = Record<string, unknown>;

interface CteEntry {
  name: { type: string; value: string } | string;
  stmt: unknown;
  columns: unknown;
}

interface FromEntry {
  table?: string | null;
  as?: string | null;
  db?: string | null;
  expr?: unknown;
  join?: string;
  on?: unknown;
  prefix?: unknown;
}

// ─── Walker ───────────────────────────────────────────────────────────────────

/**
 * Walk a SELECT node (or UNION chain) collecting table refs.
 *
 * @param node         The current SELECT-shaped AST node.
 * @param cteAliases   Set of CTE alias names defined in outer scope (lowercased).
 * @param refs         Accumulator for discovered TableRef entries.
 */
function walkSelect(node: unknown, cteAliases: Set<string>, refs: TableRef[]): void {
  if (node === null || typeof node !== 'object') return;

  const n = node as SelectNode;
  if (n['type'] !== 'select') return;

  // ── Build local CTE alias set ─────────────────────────────────────────────
  // Extend the inherited set with CTEs defined on this SELECT node.
  const localCteAliases = new Set(cteAliases);
  const withs = (n['with'] as CteEntry[] | null) ?? [];

  for (const w of withs) {
    const name = extractCteName(w.name);
    if (name) localCteAliases.add(name.toLowerCase());
  }

  // ── Walk CTE bodies ───────────────────────────────────────────────────────
  // Each CTE body is itself a SELECT; walk it with the current local alias set
  // so inner CTEs can reference outer ones correctly.
  for (const w of withs) {
    walkSelect(w.stmt, localCteAliases, refs);
  }

  // ── Walk FROM clause of this SELECT ───────────────────────────────────────
  const fromList = (n['from'] as FromEntry[] | null) ?? [];

  for (const f of fromList) {
    if (typeof f.table === 'string') {
      // Plain table reference (base table or CTE alias reference).
      //
      // Schema-qualified names: node-sql-parser places the qualifier in
      // `f.db`. We accept the single literal qualifier `cockpit` (our own
      // schema — emitted by the builder helpers in widgets/unions.ts and
      // by several intelligence-query builders) and route it through the
      // bare-name catalog lookup. Any other qualifier (e.g.
      // `evilschema.github_pull_requests`, `system.tables`) is recorded
      // with the prefix so the catalog miss surfaces as OUT_OF_CATALOG —
      // this is the schema-confusion guard that stops a scope-rewritten
      // query from silently reading the wrong schema.
      if (f.db != null && f.db.toLowerCase() !== 'cockpit') {
        refs.push({
          tableName: `${f.db}.${f.table}`,
          alias: f.as ?? null,
          enclosingSelect: n,
        });
        continue;
      }

      const lower = f.table.toLowerCase();
      if (!localCteAliases.has(lower)) {
        refs.push({
          tableName: lower,
          alias: f.as ?? null,
          enclosingSelect: n,
        });
      }
    } else if (f.expr !== undefined && f.expr !== null) {
      // Subquery in FROM: { expr: { ast: { type: 'select', ... } }, as: '...' }
      const exprNode = f.expr as Record<string, unknown>;
      const innerAst = exprNode['ast'] as unknown;
      if (innerAst !== null && typeof innerAst === 'object') {
        walkSelect(innerAst, localCteAliases, refs);
      }
    }
  }

  // ── Walk UNION branch (_next) ─────────────────────────────────────────────
  // node-sql-parser represents UNION / UNION ALL as a linked list via `_next`.
  // Each `_next` node is a full SELECT; use the same inherited aliases (not
  // the local ones — UNION branches share the outer CTE scope).
  if (n['_next'] !== undefined && n['_next'] !== null) {
    walkSelect(n['_next'], cteAliases, refs);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the string value from a CTE name node.
 *  node-sql-parser emits CTE names as `{ type: 'default', value: 'foo' }`. */
function extractCteName(name: unknown): string | null {
  if (typeof name === 'string') return name;
  if (name !== null && typeof name === 'object') {
    const n = name as Record<string, unknown>;
    if (typeof n['value'] === 'string') return n['value'];
  }
  return null;
}
