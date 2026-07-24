export type DurationUnit = 'd' | 'w' | 'm' | 'y';

export const DURATION_RE = /^(\d+(?:\.\d+)?)([dwmy])$/;

const DAYS_PER_UNIT: Record<DurationUnit, number> = {
  d: 1,
  w: 7,
  m: 30,
  y: 365,
};

export function parseDuration(
  code: string | null | undefined,
): { value: number; unit: DurationUnit } | null {
  if (!code) return null;
  const match = DURATION_RE.exec(code);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2] as DurationUnit };
}

export function durationToDays(code: string | null | undefined): number | null {
  const parsed = parseDuration(code);
  if (!parsed) return null;
  return parsed.value * DAYS_PER_UNIT[parsed.unit];
}

export function formatDuration(value: number, unit: DurationUnit): string {
  return `${value}${unit}`;
}
