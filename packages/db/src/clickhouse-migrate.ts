import * as fs from 'fs';
import * as path from 'path';

export interface ClickhouseExecClient {
  exec(params: { query: string }): Promise<unknown>;
  query(params: { query: string; format?: string }): Promise<{
    // @clickhouse/client returns a union here (T[] | ResponseJSON<T> | Record<string, T>);
    // we narrow at the call site (e.g. `(await result.json()) as MigrationRow[]`)
    // because we only ever request format=JSONEachRow, which always yields T[].
    // Using unknown (no generic) keeps the interface compatible with both the
    // real NodeClickHouseClient and the fake test client.
    json(): Promise<unknown>;
  }>;
}

export interface ClickhouseMigrationOptions {
  client: ClickhouseExecClient;
  schemasDir: string;
}

export interface ClickhouseMigrationResult {
  applied: string[];
  skipped: string[];
}

const ENSURE_DATABASE_DDL = 'CREATE DATABASE IF NOT EXISTS cockpit';

// Split a multi-statement SQL file into individual statements. ClickHouse's
// HTTP API rejects multi-statement queries (Code 62 SYNTAX_ERROR), so each
// statement must be sent separately. Splits on top-level semicolons; the DDL
// files in clickhouse/schemas/ have no string literals containing ';' so a
// naive split is safe. Comment-only lines (-- ...) are stripped before split
// to keep statement boundaries unambiguous.
function splitSqlStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const MIGRATIONS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS cockpit._ch_migrations (
  filename   String,
  applied_at DateTime DEFAULT now()
) ENGINE = MergeTree() ORDER BY filename
`.trim();

interface MigrationRow {
  filename: string;
}

export async function runClickhouseMigrations(
  opts: ClickhouseMigrationOptions,
): Promise<ClickhouseMigrationResult> {
  const { client, schemasDir } = opts;

  await client.exec({ query: ENSURE_DATABASE_DDL });
  await client.exec({ query: MIGRATIONS_TABLE_DDL });

  const appliedResult = await client.query({
    query: 'SELECT filename FROM cockpit._ch_migrations',
    format: 'JSONEachRow',
  });
  const appliedRows = (await appliedResult.json()) as MigrationRow[];
  const appliedSet = new Set(appliedRows.map((row) => row.filename));

  const allFiles = fs
    .readdirSync(schemasDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const filename of allFiles) {
    if (appliedSet.has(filename)) {
      skipped.push(filename);
      continue;
    }
    const filePath = path.join(schemasDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    if (sql.length === 0) {
      skipped.push(filename);
      continue;
    }
    const statements = splitSqlStatements(sql);
    for (const statement of statements) {
      try {
        await client.exec({ query: statement });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`ClickHouse migration ${filename} failed: ${reason}`);
      }
    }
    await client.exec({
      query: `INSERT INTO cockpit._ch_migrations (filename) VALUES ('${filename}')`,
    });
    applied.push(filename);
  }

  return { applied, skipped };
}

async function runFromCli(): Promise<void> {
  const { clickhouse } = await import('./clickhouse.js');
  const repoRoot = path.resolve(__dirname, '../../..');
  const schemasDir = process.env.CLICKHOUSE_SCHEMAS_DIR
    ?? path.join(repoRoot, 'clickhouse', 'schemas');

  if (!fs.existsSync(schemasDir)) {
    console.error(`Schemas directory not found: ${schemasDir}`);
    process.exit(1);
  }

  console.log(`Applying ClickHouse migrations from ${schemasDir}`);
  const result = await runClickhouseMigrations({ client: clickhouse, schemasDir });

  for (const filename of result.skipped) {
    console.log(`  • skipped ${filename} (already applied)`);
  }
  for (const filename of result.applied) {
    console.log(`  ✓ applied ${filename}`);
  }

  await clickhouse.close();
  console.log(`Done. ${result.applied.length} applied, ${result.skipped.length} skipped.`);
}

const invokedDirectly = require.main === module;
if (invokedDirectly) {
  runFromCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
