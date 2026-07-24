// Drill dimensions enable widget click-through into the intelligence console
// pre-filtered by the clicked value. The map below is per-widget: keys are
// dimension names exposed to the URL (?filter=author:alice) and values are
// the ClickHouse columns those names resolve to in each widget's projection.
//
// Only the four CH-backed widgets that surface clickable rows/points have
// drill support today; PR-6 wires these onto the frontend.
export const DRILL_DIMENSIONS: Readonly<Record<string, Readonly<Record<string, string>>>> =
  Object.freeze({
    MERGE_FREQUENCY_PER_DEV: Object.freeze({ author: 'author' }),
    PR_CYCLE_TIME_SCATTER: Object.freeze({ author: 'author', repo: 'repo' }),
    REVIEW_PICKUP_TIME: Object.freeze({ author: 'author' }),
    REWORK_RATE: Object.freeze({ author: 'author' }),
  });

export function drillDimensionsFor(widgetType: string): Readonly<Record<string, string>> {
  return DRILL_DIMENSIONS[widgetType] ?? {};
}

// ClickHouse single-quote escape — doubles every ' to ''.
export function escapeChString(s: string): string {
  return s.replace(/'/g, "''");
}

// ─── Drill-filter injection ──────────────────────────────────────────────────
//
// `applyDrillFilter(sql, column, value)` returns a new SQL string with a
// `<column> = '<value>'` predicate injected into the *outermost* SELECT's WHERE.
//
// Why not the prior `SELECT * FROM (<sql>) WHERE col = 'val'` wrap? It produced
// `SELECT * FROM (WITH cte AS (...) SELECT ...)` for every CTE-form builder,
// which the postgres-dialect parser used by `scope/validate.ts` splits into two
// ASTs — triggering the MULTI_STATEMENT guard before the query ever reaches
// ClickHouse.
//
// This implementation walks the SQL once, tracks paren depth and string
// literals, and finds the keyword positions at depth zero. It then either
// appends ` AND <pred>` to an existing WHERE or inserts ` WHERE <pred>` ahead
// of the first depth-zero GROUP BY / HAVING / ORDER BY / LIMIT (or at the end
// if none of those exist).

const TOP_LEVEL_BOUNDARY_RE = /^(GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/i;

interface KeywordHit {
  kind: 'WHERE' | 'BOUNDARY';
  start: number;
  end: number;
}

export function applyDrillFilter(sql: string, column: string, value: string): string {
  const predicate = `${column} = '${escapeChString(value)}'`;
  const hits = scanTopLevelKeywords(sql);

  const whereHit = hits.find((h) => h.kind === 'WHERE');
  if (whereHit) {
    // Append `AND <predicate>` to the existing outermost WHERE. The insertion
    // point is the start of the next depth-zero boundary keyword, or EOF.
    const nextBoundary = hits.find((h) => h.kind === 'BOUNDARY' && h.start > whereHit.end);
    const insertAt = nextBoundary ? nextBoundary.start : sql.length;
    return spliceAt(sql, insertAt, `AND ${predicate} `);
  }

  // No outer WHERE — insert one before the first boundary keyword if any,
  // otherwise append at end.
  const firstBoundary = hits.find((h) => h.kind === 'BOUNDARY');
  if (firstBoundary) {
    return spliceAt(sql, firstBoundary.start, `WHERE ${predicate} `);
  }
  return `${sql.replace(/\s+$/, '')} WHERE ${predicate}`;
}

// ─── Internals ───────────────────────────────────────────────────────────────

function spliceAt(sql: string, idx: number, insertion: string): string {
  // Keep separating whitespace so we don't create glued tokens like
  // `state = 'merged'AND`.
  const before = sql.slice(0, idx);
  const after = sql.slice(idx);
  const leftPad = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  return `${before}${leftPad}${insertion}${after}`;
}

function scanTopLevelKeywords(sql: string): KeywordHit[] {
  const hits: KeywordHit[] = [];
  let depth = 0;
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];

    // Single-quoted string literal (ClickHouse: '' escapes ').
    if (c === "'") {
      i = skipStringLiteral(sql, i + 1);
      continue;
    }
    // Line comment `-- ...`.
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i + 2);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    // Block comment `/* ... */`.
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (c === '(') {
      depth++;
      i++;
      continue;
    }
    if (c === ')') {
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && isWordStart(sql, i)) {
      const slice = sql.slice(i);

      // WHERE — record only the first occurrence at depth 0. Well-formed
      // builder SQL has at most one outer WHERE; later WHEREs would belong
      // to subqueries (already at depth > 0) or pathological input.
      if (/^WHERE\b/i.test(slice)) {
        if (!hits.some((h) => h.kind === 'WHERE')) {
          hits.push({ kind: 'WHERE', start: i, end: i + 5 });
        }
        i += 5;
        continue;
      }

      // First depth-zero GROUP BY / HAVING / ORDER BY / LIMIT marks the end
      // of the WHERE region.
      const m = slice.match(TOP_LEVEL_BOUNDARY_RE);
      if (m && !hits.some((h) => h.kind === 'BOUNDARY')) {
        hits.push({ kind: 'BOUNDARY', start: i, end: i + m[0].length });
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return hits;
}

function skipStringLiteral(sql: string, from: number): number {
  let i = from;
  while (i < sql.length) {
    if (sql[i] === "'") {
      if (sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return sql.length;
}

function isWordStart(sql: string, i: number): boolean {
  const prev = i === 0 ? ' ' : sql[i - 1] ?? ' ';
  return !/[A-Za-z0-9_]/.test(prev);
}
