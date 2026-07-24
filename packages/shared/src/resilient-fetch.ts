// Resilient JSON fetch for long upstream-API sync loops (ADO, etc.).
//
// A single ADO intelligence sync of a large project (e.g. Horus: 50+ repos,
// tens of thousands of PRs) issues many thousands of sequential HTTP requests.
// Over that volume a bare `fetch` will, with near-certainty, hit a transient
// socket drop/reset (surfacing as undici's generic `TypeError: fetch failed`)
// or a 429/5xx.
//
// Crucially, the timeout must cover the RESPONSE BODY read, not just the
// connection/headers. A stalled body stream on `await resp.json()` will hang
// forever if the abort timer was already cleared — which is exactly what wedged
// the Horus mega-repo sync (one worker await that never resolved, no error, no
// progress). So this helper keeps the AbortController armed until the body is
// fully parsed: a stalled body aborts and is retried like any other transient
// failure, and the worker never hangs.
//
// Non-retryable responses (e.g. 401/404) are reported as `{ ok: false, status }`
// for the caller to interpret — this helper only retries plausibly-transient
// failures.

export interface ResilientFetchOpts {
  /** Per-attempt timeout in ms covering connect + headers + body read. Default 30000. */
  timeoutMs?: number;
  /** Number of retries AFTER the first attempt. Default 3 (so 4 attempts max). */
  retries?: number;
  /** Base backoff in ms; attempt N waits backoffMs * 2^N. Default 500. */
  backoffMs?: number;
  /** Injectable delay (tests pass a no-op to avoid real waiting). */
  sleep?: (ms: number) => Promise<void>;
  /** Override the retryable classification. */
  isRetryable?: (resp: { status: number } | null, err: unknown) => boolean;
}

export interface ResilientJsonResult<T> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | null;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// A response is retryable on rate-limit (429) or any server error (5xx).
// A thrown error (network failure / timeout abort / aborted body read) is always retryable.
function defaultIsRetryable(resp: { status: number } | null, _err: unknown): boolean {
  if (resp === null) return true;
  return resp.status === 429 || resp.status >= 500;
}

export async function resilientFetchJson<T>(
  doFetch: typeof fetch,
  url: string,
  init: RequestInit = {},
  opts: ResilientFetchOpts = {},
): Promise<ResilientJsonResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const retries = opts.retries ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  const sleep = opts.sleep ?? defaultSleep;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await doFetch(url, { ...init, signal: controller.signal });
      if (!resp.ok) {
        if (attempt < retries && isRetryable(resp, null)) {
          await sleep(backoffMs * 2 ** attempt);
          continue;
        }
        return { ok: false, status: resp.status, statusText: resp.statusText, data: null };
      }
      // Body read stays inside the same timeout window: a stalled body stream
      // aborts here (throwing) instead of hanging the worker forever.
      const data = (await resp.json()) as T;
      return { ok: true, status: resp.status, statusText: resp.statusText, data };
    } catch (err) {
      lastError = err;
      if (attempt < retries && isRetryable(null, err)) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  // Unreachable in practice: the loop either returns or throws above.
  throw lastError instanceof Error ? lastError : new Error('resilientFetchJson: exhausted retries');
}
