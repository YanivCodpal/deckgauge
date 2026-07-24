const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface ResolvedPeriod {
  from: Date;
  to: Date;
}

export function resolvePeriod(
  config: Record<string, unknown>,
  now: () => number = Date.now,
  defaultDays = 30,
): ResolvedPeriod {
  const fromDate = parseIsoDate(config.from);
  const toDate = parseIsoDate(config.to);
  if (fromDate && toDate && toDate.getTime() > fromDate.getTime()) {
    return { from: fromDate, to: toDate };
  }
  const days =
    typeof config.days === 'number' && config.days > 0 ? config.days : defaultDays;
  const to = new Date(now());
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}
