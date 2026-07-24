interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Minimal in-memory TTL cache with an optional LRU size cap. `now` is injectable
 * for deterministic tests. The size cap bounds peak memory when many distinct
 * keys are live at once (e.g. switching org trees pins several large timesheet
 * engine runs) — the least-recently-used entry is evicted past `maxEntries`.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 0,
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency: re-insert so this key becomes most-recently-used.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    // Delete-then-set keeps insertion order = recency order (oldest first).
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.maxEntries > 0) {
      while (this.store.size > this.maxEntries) {
        const oldest = this.store.keys().next().value;
        if (oldest === undefined) break;
        this.store.delete(oldest);
      }
    }
  }
}
