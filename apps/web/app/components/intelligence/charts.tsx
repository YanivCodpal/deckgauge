// EI-025 — Lightweight inline-SVG charts for the intelligence dashboard.

interface HeatmapCell {
  date: string;
  value: number;
}

export function HeatmapCalendar({ cells, max }: { cells: HeatmapCell[]; max?: number }) {
  const ceiling = max ?? Math.max(1, ...cells.map((c) => c.value));
  const cols: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  return (
    <div className="flex gap-[2px]" aria-label="Activity heatmap">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[2px]">
          {col.map((cell) => {
            const intensity = Math.min(1, cell.value / ceiling);
            const bg = intensity === 0
              ? '#f1f5f9'
              : `rgba(79, 70, 229, ${0.15 + intensity * 0.85})`;
            return (
              <div
                key={cell.date}
                className="h-3 w-3 rounded-[2px]"
                style={{ background: bg }}
                title={`${cell.date}: ${cell.value}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface DeveloperRowProps {
  login: string;
  prsMerged: number;
  aiPct: number;
  medianCycleHours: number | null;
}

export function DeveloperRow({ login, prsMerged, aiPct, medianCycleHours }: DeveloperRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {login.slice(0, 2).toUpperCase()}
        </div>
        <a href={`/insights/developers/${encodeURIComponent(login)}`} className="text-sm font-medium text-slate-900 hover:underline">
          {login}
        </a>
      </div>
      <div className="flex items-center gap-6 text-sm tabular-nums text-slate-600">
        <span>{prsMerged} merged</span>
        <span>{medianCycleHours == null ? '—' : `${medianCycleHours.toFixed(1)}h cycle`}</span>
        <span className={aiPct >= 0.5 ? 'text-indigo-600 font-semibold' : ''}>
          {Math.round(aiPct * 100)}% AI
        </span>
      </div>
    </div>
  );
}

// P2 — Sparkline: tiny inline-SVG line chart for table cells.
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 20, color = '#4f46e5' }: SparklineProps) {
  if (!data || data.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Sparkline" className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

// P2 — ScatterChart: inline-SVG scatter plot. Highlights AI-assisted points.
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  aiAssisted?: boolean;
}

interface ScatterChartProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
}

export function ScatterChart({
  points,
  xLabel,
  yLabel,
  width = 600,
  height = 260,
}: ScatterChartProps) {
  if (!points || points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500"
        style={{ width, height }}
      >
        No data points to plot.
      </div>
    );
  }
  const pad = { top: 12, right: 12, bottom: 32, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(1, ...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const scaleX = (x: number) => pad.left + ((x - xMin) / xRange) * innerW;
  const scaleY = (y: number) => pad.top + innerH - ((y - yMin) / yRange) * innerH;
  return (
    <svg width={width} height={height} role="img" aria-label="Scatter chart" className="block">
      {/* axes */}
      <line
        x1={pad.left}
        y1={pad.top + innerH}
        x2={pad.left + innerW}
        y2={pad.top + innerH}
        stroke="#cbd5e1"
      />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#cbd5e1" />
      {/* axis labels */}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="#64748b">
        {xLabel}
      </text>
      <text
        x={10}
        y={height / 2}
        textAnchor="middle"
        fontSize={11}
        fill="#64748b"
        transform={`rotate(-90 10 ${height / 2})`}
      >
        {yLabel}
      </text>
      {/* points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={scaleX(p.x)}
          cy={scaleY(p.y)}
          r={p.aiAssisted ? 4 : 3}
          fill={p.aiAssisted ? '#4f46e5' : '#94a3b8'}
          opacity={0.75}
        >
          {p.label ? <title>{p.label}</title> : null}
        </circle>
      ))}
    </svg>
  );
}

// P2 — WeeklyTrend: inline-SVG line chart for a sequence of week-keyed values.
export interface WeeklyTrendPoint {
  x: string; // week_start label
  y: number;
}

interface WeeklyTrendProps {
  points: WeeklyTrendPoint[];
  yLabel?: string;
  width?: number;
  height?: number;
}

export function WeeklyTrend({ points, yLabel, width = 600, height = 200 }: WeeklyTrendProps) {
  if (!points || points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500"
        style={{ width, height }}
      >
        No trend data yet.
      </div>
    );
  }
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const ys = points.map((p) => p.y);
  const yMax = Math.max(1, ...ys);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const poly = points
    .map((p, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + innerH - (p.y / yMax) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Weekly trend" className="block">
      <line
        x1={pad.left}
        y1={pad.top + innerH}
        x2={pad.left + innerW}
        y2={pad.top + innerH}
        stroke="#cbd5e1"
      />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#cbd5e1" />
      {yLabel ? (
        <text
          x={10}
          y={height / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#64748b"
          transform={`rotate(-90 10 ${height / 2})`}
        >
          {yLabel}
        </text>
      ) : null}
      <polyline fill="none" stroke="#4f46e5" strokeWidth={2} points={poly} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={pad.left + i * stepX}
          cy={pad.top + innerH - (p.y / yMax) * innerH}
          r={2.5}
          fill="#4f46e5"
        >
          <title>{`${p.x}: ${p.y}`}</title>
        </circle>
      ))}
      {points.length > 0 ? (
        <>
          <text
            x={pad.left}
            y={height - 6}
            fontSize={10}
            fill="#64748b"
            textAnchor="start"
          >
            {points[0]!.x}
          </text>
          <text
            x={pad.left + innerW}
            y={height - 6}
            fontSize={10}
            fill="#64748b"
            textAnchor="end"
          >
            {points[points.length - 1]!.x}
          </text>
        </>
      ) : null}
    </svg>
  );
}

interface CycleTimeFunnelProps {
  createdToFirstReview: number | null;
  firstReviewToApproval: number | null;
  approvalToMerge: number | null;
}

export function CycleTimeFunnel({
  createdToFirstReview,
  firstReviewToApproval,
  approvalToMerge,
}: CycleTimeFunnelProps) {
  const stages = [
    { label: 'Created → 1st review', value: createdToFirstReview },
    { label: '1st review → approval', value: firstReviewToApproval },
    { label: 'Approval → merge', value: approvalToMerge },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value ?? 0));
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-xs text-slate-600">
            <span>{s.label}</span>
            <span className="tabular-nums">{s.value == null ? '—' : `${s.value.toFixed(1)}h`}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-slate-100">
            <div
              className="h-2 rounded bg-indigo-500"
              style={{ width: `${s.value == null ? 0 : Math.round((s.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
