import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export enum CassetteMode {
  REPLAY = 'replay',
  RECORD = 'record',
}

export interface CassetteEntry {
  scope: string;
  method: string;
  path: string;
  body: unknown;
  status: number;
}

export interface WithCassetteOpts {
  path: string;
  mode?: CassetteMode;
  redact?: string[];
}

function redactBody(body: string, secrets: string[]): string {
  let out = body;
  for (const s of secrets) {
    if (!s) continue;
    out = out.split(s).join('REDACTED');
  }
  return out;
}

function findEntry(
  entries: CassetteEntry[],
  method: string,
  scope: string,
  path: string,
): CassetteEntry | undefined {
  const m = method.toUpperCase();
  return entries.find((e) => e.method.toUpperCase() === m && e.scope === scope && e.path === path);
}

export async function withCassette<T>(
  opts: WithCassetteOpts,
  fn: () => Promise<T>,
): Promise<T> {
  const mode = opts.mode ?? (existsSync(opts.path) ? CassetteMode.REPLAY : CassetteMode.RECORD);

  if (mode === CassetteMode.REPLAY) {
    if (!existsSync(opts.path)) throw new Error(`cassette not found: ${opts.path}`);
    const entries: CassetteEntry[] = JSON.parse(readFileSync(opts.path, 'utf-8'));
    if (entries.length === 0) throw new Error(`no cassette entry for any request — empty cassette: ${opts.path}`);
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : (input as Request).url);
      const scope = `${url.protocol}//${url.host}`;
      const path = url.pathname + url.search;
      const method = (init?.method ?? 'GET').toUpperCase();
      const entry = findEntry(entries, method, scope, path);
      if (!entry) {
        throw new Error(`no cassette entry for ${method} ${scope}${path}`);
      }
      return new Response(JSON.stringify(entry.body), {
        status: entry.status,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    try {
      return await fn();
    } finally {
      globalThis.fetch = original;
    }
  }

  const original = globalThis.fetch;
  const recorded: CassetteEntry[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : (input as Request).url);
    const resp = await original(input, init);
    const text = await resp.clone().text();
    recorded.push({
      scope: `${url.protocol}//${url.host}`,
      method: (init?.method ?? 'GET').toUpperCase(),
      path: url.pathname + url.search,
      body: text ? JSON.parse(text) : null,
      status: resp.status,
    });
    return resp;
  }) as typeof fetch;
  try {
    const result = await fn();
    const redacted = JSON.stringify(recorded, null, 2);
    const out = opts.redact ? redactBody(redacted, opts.redact) : redacted;
    mkdirSync(dirname(opts.path), { recursive: true });
    writeFileSync(opts.path, out);
    return result;
  } finally {
    globalThis.fetch = original;
  }
}
