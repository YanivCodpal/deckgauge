// Inline ClickHouse parameter substitution.
//
// ClickHouse parameterised queries use `{name:Type}` markers that are bound at
// query time via the driver's `query_params`. The intelligence console takes a
// different path: the user sees the SQL in an editor and submits it through
// `/execute`, which does not forward params. So the `/sql` endpoint must bake
// values into the SQL text before returning it, with safe ClickHouse-style
// literals.
//
// Why not let the user see the templated form? Two reasons:
//   1. The editor would be unreadable — values are the user's own board scope
//      and the period they just picked; concealing them defeats the purpose.
//   2. `/execute` would receive unbound markers and ClickHouse would reject
//      the query.
//
// All values that flow through here come from server-trusted sources:
// `BoardScope` (from IAM-scoped Prisma queries) and the resolved period
// (server-computed). No user-supplied request body is interpolated.

// Matches `{name:Type}` or `{name:Array(T)}`. Mirrors the pre-mask regex used
// by scope/parser.ts so the two stay in lockstep.
const PARAM_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*):([A-Za-z0-9()_, ]+?)\}/g;

export function interpolateChParams(sql: string, params: Record<string, unknown>): string {
  return walkOutsideStringLiterals(sql, (chunk) =>
    chunk.replace(PARAM_RE, (_full, name: string, typeSpec: string) => {
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        throw new Error(`interpolateChParams: missing parameter '${name}'`);
      }
      return formatChValue(params[name], typeSpec, name);
    })
  );
}

// ─── String-literal-aware walk ───────────────────────────────────────────────
// Single-quoted SQL string literals must pass through untouched even if their
// contents happen to look like a `{name:Type}` placeholder. ClickHouse escapes
// embedded single quotes by doubling: `'O''Brien'`.

function walkOutsideStringLiterals(
  sql: string,
  transform: (chunkOutsideQuotes: string) => string
): string {
  const out: string[] = [];
  let i = 0;
  while (i < sql.length) {
    const openQuote = sql.indexOf("'", i);
    if (openQuote === -1) {
      out.push(transform(sql.slice(i)));
      break;
    }
    out.push(transform(sql.slice(i, openQuote)));
    const closeQuote = findClosingQuote(sql, openQuote + 1);
    if (closeQuote === -1) {
      // Unterminated string literal — pass remainder verbatim so the executor
      // sees the same parse failure the user would otherwise have hit.
      out.push(sql.slice(openQuote));
      break;
    }
    out.push(sql.slice(openQuote, closeQuote + 1));
    i = closeQuote + 1;
  }
  return out.join('');
}

function findClosingQuote(sql: string, from: number): number {
  let i = from;
  while (i < sql.length) {
    if (sql[i] === "'") {
      if (sql[i + 1] === "'") {
        i += 2; // escaped quote: '' is one literal '
      } else {
        return i;
      }
    } else {
      i++;
    }
  }
  return -1;
}

// ─── Per-type formatters ─────────────────────────────────────────────────────

function formatChValue(value: unknown, typeSpec: string, name: string): string {
  const norm = typeSpec.replace(/\s+/g, '');

  // Array(T) — recurse per element. ClickHouse expects a parenthesised tuple
  // `(a,b,c)` for `IN` predicates; empty tuples are invalid SQL and typically
  // signal a bug upstream (builders should return null when scope is empty),
  // so we throw instead of emitting `()`.
  if (norm.startsWith('Array(')) {
    if (!Array.isArray(value)) {
      throw new Error(
        `interpolateChParams: parameter '${name}' expected an array for ${typeSpec}, received ${typeof value}`
      );
    }
    if (value.length === 0) {
      throw new Error(
        `interpolateChParams: parameter '${name}' is an empty array; ClickHouse rejects 'IN ()'`
      );
    }
    const innerType = norm.slice('Array('.length, -1);
    return `(${value.map((v) => formatChValue(v, innerType, name)).join(',')})`;
  }

  if (/^(String|FixedString|LowCardinality\(String\))/.test(norm)) {
    return quoteString(value);
  }

  if (/^(Date|DateTime)/.test(norm)) {
    // Builders pass already-formatted ISO-like strings (see formatDateTime
    // in widget-helpers.ts). Quote verbatim with quote-doubling.
    return quoteString(value);
  }

  if (/^(U?Int(8|16|32|64|128|256)|Float(32|64)|Decimal)/.test(norm)) {
    if (typeof value !== 'number' && typeof value !== 'bigint') {
      throw new Error(
        `interpolateChParams: parameter '${name}' expected a number for ${typeSpec}, received ${typeof value}`
      );
    }
    return String(value);
  }

  throw new Error(
    `interpolateChParams: unsupported ClickHouse type '${typeSpec}' for parameter '${name}'`
  );
}

function quoteString(value: unknown): string {
  const s = String(value);
  return `'${s.replace(/'/g, "''")}'`;
}
