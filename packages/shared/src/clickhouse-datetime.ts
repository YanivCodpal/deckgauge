// EI-046 — ClickHouse date formatting helpers.
// ClickHouse DateTime columns parse 'YYYY-MM-DD HH:MM:SS' UTC; reject ISO with ms or TZ offsets.

export function chDateTime(input: string | Date | null | undefined): string | null {
  if (input == null) return null;
  if (input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function chDate(input: string | Date | null | undefined): string | null {
  if (input == null) return null;
  if (input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return d.toISOString().slice(0, 10);
}

export function chDateTimeRequired(input: string | Date | null | undefined): string {
  const formatted = chDateTime(input);
  if (formatted) return formatted;
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
