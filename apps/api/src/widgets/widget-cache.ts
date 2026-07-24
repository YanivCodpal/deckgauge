export class WidgetCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly ttlMs: number = 60_000) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  static makeKey(boardId: string, widgetType: string, config: Record<string, unknown>): string {
    return `${boardId}:${widgetType}:${JSON.stringify(config)}`;
  }
}
