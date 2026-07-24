/** Calendar years/months/days between a hire date and now; null when no date. */
export function lengthOfService(
  hireDateIso: string | null,
  nowIso: string,
): { years: number; months: number; days: number } | null {
  if (!hireDateIso) return null;
  const start = new Date(hireDateIso);
  const now = new Date(nowIso);
  if (Number.isNaN(start.getTime()) || now < start) return null;

  let years = now.getUTCFullYear() - start.getUTCFullYear();
  let months = now.getUTCMonth() - start.getUTCMonth();
  let days = now.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0),
    ).getUTCDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
