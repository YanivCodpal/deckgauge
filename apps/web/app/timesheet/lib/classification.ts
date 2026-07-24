/**
 * Single source of truth for the CapEx / OpEx / Unclassified visual language.
 * Used by the split bar, classification pills, and the report chart so the
 * same colour means the same thing everywhere in the timesheet.
 */

export const SPLIT_COLORS = {
  capex: '#00c875', // monday "done" green — investment
  opex: '#fdab3d', // monday "in progress" amber — run-the-business
  unclassified: '#cbd5e1', // slate — needs attention
} as const;

export interface ClassificationMeta {
  label: string;
  /** Tailwind classes for a small pill badge. */
  pill: string;
}

const META: Record<string, ClassificationMeta> = {
  CAPEX: { label: 'CapEx', pill: 'bg-emerald-100 text-emerald-700' },
  OPEX: { label: 'OpEx', pill: 'bg-amber-100 text-amber-700' },
};

export function classificationMeta(classification: string): ClassificationMeta | null {
  return META[classification] ?? null;
}

/** The dot/accent hex for a classification, from the same palette as the split bar. */
export function classificationColor(classification: string): string {
  if (classification === 'CAPEX') return SPLIT_COLORS.capex;
  if (classification === 'OPEX') return SPLIT_COLORS.opex;
  return SPLIT_COLORS.unclassified;
}
