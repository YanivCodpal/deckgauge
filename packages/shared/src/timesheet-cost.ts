// Timesheet capitalization cost — converts in-progress effort (seconds, as the
// timesheet Report already computes per CAPEX/OPEX bucket) into a money figure
// via a single blended hourly rate. Pure + tested so the Report UI, CSV export,
// and any future consumer dollarize hours identically.
//
// A blended rate (one editable $/hour for the whole org) is a deliberate v1
// choice: it needs no per-person salary data and is the standard basis for a
// rough software-capitalization estimate. The number is only ever as good as
// the rate the user enters — callers should label it an estimate.

/** Default blended fully-loaded engineering rate ($/hour) when the user hasn't set one. */
export const DEFAULT_BLENDED_HOURLY_RATE = 75;

/**
 * Cost = hours × rate. Returns 0 for non-positive or non-finite inputs so a
 * missing/blank rate never yields NaN in the UI.
 */
export function costFromSeconds(seconds: number, hourlyRate: number): number {
  if (
    !Number.isFinite(seconds) ||
    !Number.isFinite(hourlyRate) ||
    seconds <= 0 ||
    hourlyRate <= 0
  ) {
    return 0;
  }
  return (seconds / 3600) * hourlyRate;
}
