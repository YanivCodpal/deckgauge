export interface RateLimiterOpts {
  budget: number;
  refillMs: number;
  pauseFloor?: number;
}

export class RateLimiter {
  private tokens: number;
  private refillAt: number;
  private pauseUntil = 0;

  constructor(private readonly opts: RateLimiterOpts) {
    this.tokens = opts.budget;
    this.refillAt = Date.now() + opts.refillMs;
  }

  async acquire(cost: number): Promise<void> {
    while (Date.now() < this.pauseUntil) {
      await new Promise((r) => setTimeout(r, this.pauseUntil - Date.now()));
    }
    this.refillIfNeeded();
    while (this.tokens < cost) {
      const waitMs = Math.max(this.refillAt - Date.now(), 1_000);
      await new Promise((r) => setTimeout(r, waitMs));
      this.refillIfNeeded();
    }
    this.tokens -= cost;
  }

  observe(info: { remaining: number; resetEpochSec: number }): void {
    this.tokens = Math.min(this.tokens, info.remaining);
    const floor = this.opts.pauseFloor ?? 500;
    if (info.remaining < floor) this.pauseUntil = info.resetEpochSec * 1000;
  }

  snapshot(): { tokens: number; pauseUntil: number } {
    return { tokens: this.tokens, pauseUntil: this.pauseUntil };
  }

  private refillIfNeeded(): void {
    if (Date.now() >= this.refillAt) {
      this.tokens = this.opts.budget;
      this.refillAt = Date.now() + this.opts.refillMs;
    }
  }
}
