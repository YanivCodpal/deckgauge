import type { CapexReportResponse } from '@deckgauge/shared';

function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildReportCsv(report: CapexReportResponse): string {
  if (report.byGroup.length > 0) {
    const header = 'Group,CapEx Hours,OpEx Hours,Unclassified Hours,CapEx %';
    const rows = report.byGroup.map((g) =>
      [quote(g.group), hours(g.capexSeconds), hours(g.opexSeconds), hours(g.unclassifiedSeconds), g.capexPct.toFixed(1)].join(','),
    );
    return [header, ...rows].join('\n');
  }
  const header = 'Bucket,CapEx Hours,OpEx Hours,Unclassified Hours';
  const rows = report.byBucket.map((b) =>
    [quote(b.bucketKey), hours(b.capexSeconds), hours(b.opexSeconds), hours(b.unclassifiedSeconds)].join(','),
  );
  return [header, ...rows].join('\n');
}
