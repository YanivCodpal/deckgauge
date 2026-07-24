/**
 * Format a date as relative time (e.g., "2h ago") or short month+day.
 * @param date The date to format (Date object or ISO string)
 * @returns Relative time for recent dates (< 7 days), short month+day otherwise
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const absDiffMs = Math.abs(diffMs);
  const diffSecs = Math.floor(absDiffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Within 7 days: show relative time (only if past)
  if (diffDays < 7 && diffMs >= 0) {
    if (diffMins < 1) return "0m ago";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  // 7+ days or future: show short month+day (e.g., "Apr 15")
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

/**
 * Format a date as a short absolute label (e.g., "Apr 15") using UTC.
 *
 * Unlike formatRelative, this does NOT read `Date.now()` and pins the
 * timezone to UTC + locale to en-US, so it produces identical output on the
 * server and the client. Use it as the SSR-stable initial value where the
 * relative form would create a hydration mismatch.
 *
 * @param date The date to format (Date object or ISO string)
 * @returns Month+day formatted in en-US / UTC (e.g., "Apr 15")
 */
export function formatAbsoluteShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = d.getUTCDate();
  return `${month} ${day}`;
}
