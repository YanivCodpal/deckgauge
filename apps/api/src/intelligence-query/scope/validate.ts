import type { AST } from 'node-sql-parser';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Lowercase for case-insensitive matching.
const DENYLIST_FUNCTIONS = new Set([
  'file',
  'url',
  'remote',
  'cluster',
  'clusterallreplicas',
  's3',
  'mysql',
  'postgresql',
  'jdbc',
  'hdfs',
  'odbc',
  'executable',
  'merge',
  'numbers',
  'numbers_mt',
  'zeros',
  'generaterandom',
]);

/**
 * Validate a parsed SQL AST.
 *
 * Rules:
 *  1. Multi-statement arrays (semicolon-separated SQL) → MULTI_STATEMENT
 *  2. Any statement type other than SELECT → NON_SELECT
 *  3. Any function node whose name is in the denylist → DENYLISTED_FUNCTION
 *
 * Throws `ValidationError` on the first violation found. Returns void on success.
 */
export function validateStatement(ast: AST | AST[]): void {
  if (Array.isArray(ast)) {
    throw new ValidationError(
      'Only single SELECT statements are allowed.',
      'MULTI_STATEMENT',
    );
  }

  if (ast.type !== 'select') {
    throw new ValidationError(
      `Only SELECT statements are allowed; received '${ast.type.toUpperCase()}'.`,
      'NON_SELECT',
    );
  }

  walkForDenylist(ast);
}

// ─── AST walker ──────────────────────────────────────────────────────────────

function walkForDenylist(node: unknown): void {
  if (node === null || typeof node !== 'object') return;

  const n = node as Record<string, unknown>;

  // node-sql-parser represents all user-defined and built-in function calls as:
  //   { type: 'function', name: { name: [{ type: 'default', value: '<fn>' }] }, args: ... }
  // or occasionally as:
  //   { type: 'aggr_func', name: '<fn>' }  (count, sum, etc. — included for safety)
  if (n['type'] === 'function' || n['type'] === 'aggr_func') {
    const candidate = extractFunctionName(n);
    if (candidate !== null && DENYLIST_FUNCTIONS.has(candidate.toLowerCase())) {
      throw new ValidationError(
        `Function '${candidate}' is not allowed in the intelligence console.`,
        'DENYLISTED_FUNCTION',
      );
    }
  }

  for (const value of Object.values(n)) {
    if (Array.isArray(value)) {
      for (const item of value) walkForDenylist(item);
    } else {
      walkForDenylist(value);
    }
  }
}

function extractFunctionName(n: Record<string, unknown>): string | null {
  // Shape 1: name is a plain string  (aggr_func / older node-sql-parser versions)
  if (typeof n['name'] === 'string') return n['name'];

  // Shape 2: name is { name: [{ value: '<fn>' }] }  (standard function nodes)
  if (n['name'] !== null && typeof n['name'] === 'object') {
    const nm = n['name'] as { name?: Array<{ value?: string }> };
    const parts = nm.name;
    if (Array.isArray(parts) && parts.length > 0 && typeof parts[0]?.value === 'string') {
      return parts[0].value;
    }
  }

  return null;
}
