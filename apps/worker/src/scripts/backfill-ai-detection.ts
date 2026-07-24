/**
 * Backfill AI-assistance detection over existing ClickHouse commit rows.
 *
 * Historical github_commits were written by an older sync path that never ran
 * detectAiAssistance, so ai_assisted=0 / ai_confidence=NULL for every row even
 * when the commit message carries a "Co-Authored-By: Claude" trailer. This
 * recomputes detection from the stored message/branch/author and re-inserts the
 * full row with a bumped synced_at; the ReplacingMergeTree(synced_at) engine
 * then keeps the corrected row. Idempotent — safe to re-run.
 *
 * Usage (from repo root, against local staging ClickHouse):
 *   pnpm --filter @deckgauge/worker exec tsx src/scripts/backfill-ai-detection.ts [repoFullName ...]
 *
 * Connection (host defaults; override via env):
 *   CH_HTTP=http://localhost:8123  CH_USER=cockpit  CH_PASS=cockpit  CH_DB=cockpit
 */
import { detectAiAssistance } from '@deckgauge/shared';

const HOST = process.env.CH_HTTP ?? 'http://localhost:8123';
const USER = process.env.CH_USER ?? 'cockpit';
const PASS = process.env.CH_PASS ?? 'cockpit';
const DB = process.env.CH_DB ?? 'cockpit';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

interface CommitRow {
  message: string;
  branch: string | null;
  author_login: string | null;
  ai_assisted: number;
  ai_confidence: number | null;
  ai_signals: string;
  synced_at: string;
  [k: string]: unknown;
}

async function ch(sql: string, body?: string): Promise<string> {
  const url = `${HOST}/?database=${encodeURIComponent(DB)}` + (body ? `&query=${encodeURIComponent(sql)}` : '');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: AUTH },
    body: body ?? sql,
  });
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${await res.text()}`);
  return res.text();
}

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

async function main(): Promise<void> {
  const repos = process.argv.slice(2);
  const repoFilter =
    repos.length > 0
      ? ` WHERE repo_full_name IN (${repos.map((r) => `'${r.replace(/'/g, "''")}'`).join(', ')})`
      : '';

  console.log(`[backfill] target=cockpit.github_commits${repoFilter || ' (ALL repos)'}`);

  const before = (
    await ch(`SELECT countIf(ai_assisted=1) AS a, count() AS t FROM cockpit.github_commits FINAL${repoFilter} FORMAT JSONEachRow`)
  ).trim();
  console.log(`[backfill] before: ${before}`);

  const raw = await ch(
    `SELECT * FROM cockpit.github_commits FINAL${repoFilter} FORMAT JSONEachRow`,
  );
  const rows: CommitRow[] = raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as CommitRow);

  const stamp = nowDateTime();
  let changed = 0;
  for (const row of rows) {
    const ai = detectAiAssistance({
      commitMessage: row.message,
      branchName: row.branch ?? undefined,
      authorLogin: row.author_login ?? undefined,
    });
    const next = ai.aiAssisted ? 1 : 0;
    if (next !== row.ai_assisted || row.ai_confidence === null) changed++;
    row.ai_assisted = next;
    row.ai_confidence = ai.confidence;
    row.ai_signals = JSON.stringify(ai.signals);
    row.synced_at = stamp;
  }

  if (rows.length > 0) {
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const body =
        'INSERT INTO cockpit.github_commits FORMAT JSONEachRow\n' +
        slice.map((r) => JSON.stringify(r)).join('\n');
      await ch('', body);
    }
  }
  await ch('OPTIMIZE TABLE cockpit.github_commits FINAL');

  const after = (
    await ch(`SELECT countIf(ai_assisted=1) AS a, count() AS t FROM cockpit.github_commits FINAL${repoFilter} FORMAT JSONEachRow`)
  ).trim();
  console.log(`[backfill] reprocessed ${rows.length} rows, ${changed} ai-fields updated`);
  console.log(`[backfill] after:  ${after}`);
}

main().catch((e) => {
  console.error('[backfill] FAILED:', e);
  process.exit(1);
});
