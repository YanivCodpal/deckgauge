import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type ClickHouseClient } from '@clickhouse/client';

export interface ClickHouseTestContainer {
  url: string;
  client: ClickHouseClient;
  stop(): Promise<void>;
}

export interface StartOpts {
  schemaDir?: string;
  image?: string;
  port?: number;
}

function freePort(): number {
  return 49152 + Math.floor(Math.random() * 16383);
}

async function waitForReady(url: string, timeoutMs = 30_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const resp = await fetch(`${url}/ping`);
      if (resp.ok) return;
    } catch { /* swallow until timeout */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`ClickHouse container did not become ready within ${timeoutMs}ms`);
}

export function hasDocker(): boolean {
  const r = spawnSync('docker', ['info'], { stdio: 'pipe' });
  return r.status === 0;
}

export async function startClickHouseContainer(opts: StartOpts = {}): Promise<ClickHouseTestContainer> {
  const image = opts.image ?? 'clickhouse/clickhouse-server:24.3';
  const port = opts.port ?? freePort();
  const name = `vpc-ch-test-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

  spawnSync('docker', ['pull', '--quiet', image], { stdio: 'pipe' });

  const run = spawnSync('docker', [
    'run', '--rm', '-d',
    '--name', name,
    '-p', `${port}:8123`,
    '--ulimit', 'nofile=262144:262144',
    '-e', 'CLICKHOUSE_SKIP_USER_SETUP=1',
    image,
  ], { encoding: 'utf-8' });
  if (run.status !== 0) {
    throw new Error(`docker run failed: ${run.stderr}`);
  }

  const url = `http://localhost:${port}`;
  await waitForReady(url);

  const client = createClient({ url, database: 'default' });
  await client.command({ query: `CREATE DATABASE IF NOT EXISTS cockpit` });

  if (opts.schemaDir) {
    const files = readdirSync(opts.schemaDir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = readFileSync(join(opts.schemaDir, f), 'utf-8');
      const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        try {
          await client.command({ query: stmt });
        } catch (e) {
          // Some statements are CREATE TABLE IF NOT EXISTS — re-runs are safe. Re-throw on real errors.
          if (!String(e).match(/already exists|TABLE_ALREADY_EXISTS/i)) throw e;
        }
      }
    }
  }

  return {
    url,
    client,
    async stop() {
      await client.close();
      spawnSync('docker', ['stop', name], { stdio: 'pipe' });
    },
  };
}
