// EI-024 — MetricCard + AiBadge (minimum-viable variants for Phase 3 dashboard).

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; pct?: number };
  hint?: string;
}

export function MetricCard({ label, value, trend, hint }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {trend ? (
          <span
            className={
              trend.direction === 'up'
                ? 'text-emerald-600 text-xs font-semibold'
                : trend.direction === 'down'
                  ? 'text-rose-600 text-xs font-semibold'
                  : 'text-slate-500 text-xs font-semibold'
            }
          >
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '•'}{' '}
            {trend.pct !== undefined ? `${Math.abs(trend.pct).toFixed(1)}%` : ''}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

interface AiBadgeProps {
  confidence: number;
}

export function AiBadge({ confidence }: AiBadgeProps) {
  if (confidence < 0.5) return null;
  const tone =
    confidence >= 0.85
      ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
      : 'bg-slate-50 text-slate-600 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${tone}`}
      title={`AI-assisted (confidence ${Math.round(confidence * 100)}%)`}
    >
      🤖 AI
    </span>
  );
}
