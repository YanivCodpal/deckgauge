export interface BenchmarkConfig {
  direction: 'higher_is_better' | 'lower_is_better';
  elite: number;
  high: number;
  medium: number;
  unit: 'hours' | 'days' | 'count' | 'percent' | 'lines';
}

export type Tier = 'elite' | 'high' | 'medium' | 'low';

// Thresholds from DX 2025 Benchmarking Study; see METRICS-CATALOGUE.md §17.
export const BENCHMARKS_V1 = {
  LEAD_TIME_FOR_CHANGES: {
    direction: 'lower_is_better', elite: 24, high: 168, medium: 720, unit: 'hours',
  },
  REVIEW_PICKUP_TIME: {
    direction: 'lower_is_better', elite: 4, high: 24, medium: 72, unit: 'hours',
  },
  PR_SIZE_DISTRIBUTION: {
    direction: 'lower_is_better', elite: 250, high: 500, medium: 1000, unit: 'lines',
  },
  MERGE_FREQUENCY_PER_DEV: {
    direction: 'higher_is_better', elite: 5, high: 3, medium: 1, unit: 'count',
  },
  REWORK_RATE: {
    direction: 'lower_is_better', elite: 15, high: 25, medium: 40, unit: 'percent',
  },
  TICKET_COVERAGE_RATE: {
    direction: 'higher_is_better', elite: 80, high: 60, medium: 40, unit: 'percent',
  },
} as const satisfies Record<string, BenchmarkConfig>;

export function tierFor(value: number, cfg: BenchmarkConfig): Tier {
  if (cfg.direction === 'lower_is_better') {
    if (value < cfg.elite) return 'elite';
    if (value < cfg.high) return 'high';
    if (value < cfg.medium) return 'medium';
    return 'low';
  }
  if (value >= cfg.elite) return 'elite';
  if (value >= cfg.high) return 'high';
  if (value >= cfg.medium) return 'medium';
  return 'low';
}
