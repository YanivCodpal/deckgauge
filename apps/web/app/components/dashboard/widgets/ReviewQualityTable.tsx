'use client';

export interface ReviewQualityMetrics {
  coverage_pct: number | null;
  median_open_h: number | null;
  instant_pct: number | null;
  comment_pct: number | null;
  ticket_pct: number | null;
}

interface Props {
  metrics: ReviewQualityMetrics;
}

const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`);
const fmtHrs = (v: number | null) => (v === null ? '—' : `${v} h`);

// Fixed five-row review-quality scorecard body. Extracted so Phase 2 widgets
// (e.g. per-team breakdowns) can reuse the same row set/labels against a
// different data source without duplicating markup.
export function ReviewQualityTable({ metrics }: Props) {
  const rows = [
    { kpi: 'Peer approval before merge (coverage)', value: fmtPct(metrics.coverage_pct) },
    { kpi: 'Review takes real time (median PR open)', value: fmtHrs(metrics.median_open_h) },
    { kpi: 'Merged < 10 min of opening (instant)', value: fmtPct(metrics.instant_pct) },
    { kpi: 'Reviews that left a written comment', value: fmtPct(metrics.comment_pct) },
    { kpi: 'Merged PRs referencing a ticket', value: fmtPct(metrics.ticket_pct) },
  ];

  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.kpi} className="border-b border-slate-100">
            <td className="py-2 text-slate-700">{r.kpi}</td>
            <td className="py-2 text-right font-mono tabular-nums text-emerald-600">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
