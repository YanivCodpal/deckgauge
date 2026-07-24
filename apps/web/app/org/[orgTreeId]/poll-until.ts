'use client';

// Shared client-side polling helper for the org page's two long-running syncs
// (Microsoft Graph source sync + org-tree ↔ board match). Both enqueue a worker
// job and then need the UI to wait for completion before refreshing, without a
// manual browser reload.

export interface PollOptions {
  /** Delay between reads. The first read is immediate (fetch-first). */
  intervalMs?: number;
  /** Give up after this many reads (guards against a job that never finishes). */
  maxAttempts?: number;
}

// Defaults sized for a full org sync (worker fans out many Graph calls). At
// 3s × 40 that is a two-minute ceiling before the poll gives up.
export const DEFAULT_POLL_INTERVAL_MS = 3000;
export const DEFAULT_POLL_MAX_ATTEMPTS = 40;

/**
 * Repeatedly calls `fetchStatus` until `isDone(value)` is true or the attempt
 * budget is exhausted. Fetch-first: the first read happens immediately with no
 * delay, so an already-finished job resolves without waiting; a delay only
 * separates subsequent reads. `onValue` fires on every successful read so the
 * caller can show interim progress.
 *
 * Returns the last successfully fetched value (whether or not it was "done"),
 * or null if every read failed.
 */
export async function pollUntil<T>(
  fetchStatus: () => Promise<T | null>,
  isDone: (value: T) => boolean,
  onValue?: (value: T) => void,
  options: PollOptions = {},
): Promise<T | null> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;

  let last: T | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const value = await fetchStatus();
    if (value) {
      last = value;
      onValue?.(value);
      if (isDone(value)) return last;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return last;
}
