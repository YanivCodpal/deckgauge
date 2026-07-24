import * as XLSX from 'xlsx';
import type { RawOrgRow } from '@deckgauge/shared';

const COLS: Record<string, keyof RawOrgRow> = {
  'employee id': 'employeeId',
  name: 'name',
  'supervisor id': 'supervisorId',
  role: 'role',
  email: 'email',
};

export function parseOrgChartBuffer(buf: Buffer, _filename: string): RawOrgRow[] {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return records.map((rec, i) => {
    const row: RawOrgRow = { rowNumber: i + 2 }; // +1 for 0-index, +1 for header
    for (const [header, value] of Object.entries(rec)) {
      const key = COLS[header.trim().toLowerCase()];
      if (key && key !== 'rowNumber') (row as unknown as Record<string, unknown>)[key] = String(value ?? '');
    }
    return row;
  });
}
