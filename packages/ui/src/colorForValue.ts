/** Monday-style palette reused from the project board's status colors. */
export const PILL_PALETTE = [
  '#00C875', '#579BFC', '#FF642E', '#FDAB3D', '#A25DDC', '#E2445C',
  '#2B76E5', '#66CCFF', '#BB3354', '#9CD326', '#FF158A', '#784BD1',
] as const;

/** Neutral grey used for empty / unset values. */
export const EMPTY_PILL_COLOR = '#C4C4C4';

/**
 * Map an arbitrary string value to a stable color from PILL_PALETTE.
 * Empty, whitespace-only, or nullish values get EMPTY_PILL_COLOR.
 * Normalizes case + surrounding whitespace so "Full_Time" and " full_time "
 * share a color.
 */
export function colorForValue(value: string | null | undefined): string {
  const key = (value ?? '').trim().toLowerCase();
  if (key === '') return EMPTY_PILL_COLOR;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PILL_PALETTE.length;
  return PILL_PALETTE[idx]!;
}
