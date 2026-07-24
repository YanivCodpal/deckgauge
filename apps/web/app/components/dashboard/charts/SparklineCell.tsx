'use client';

interface Props { points: number[]; width?: number; height?: number; showLast?: boolean }

export function SparklineCell({ points, width = 80, height = 24, showLast = false }: Props) {
  if (points.length === 0) return <span className="text-slate-400">—</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <svg width={width} height={height} aria-hidden="true">
        <polyline fill="none" stroke="#4f46e5" strokeWidth={1.5} points={coords} />
      </svg>
      {showLast ? <span className="text-[11px] tabular-nums text-slate-600">{points.at(-1)}</span> : null}
    </span>
  );
}
