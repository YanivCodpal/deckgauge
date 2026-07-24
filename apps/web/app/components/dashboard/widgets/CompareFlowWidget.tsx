'use client';
import { TrendLineChart } from '../charts/TrendLineChart';
import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';
import {
  CompareScorecardTable,
  boardColor,
  fmtNum,
  type ComparabilityFlag,
  type ScorecardRow,
} from './comparison-shared';

interface Props {
  boardId: string; // carries the comparison id
  config: Record<string, unknown>;
}

interface SeriesPoint {
  period: string;
  delivered: number;
  cycle_days: number | null;
  sample: number;
  flagged: boolean;
}

interface Board {
  boardId: string;
  boardName: string;
  effectiveDevHeadcount: number | null;
  series: SeriesPoint[];
}

interface Data {
  boards: Board[];
  comparability: {
    cycle_days: ComparabilityFlag;
    delivered: ComparabilityFlag;
  };
}

// Median of the numeric cycle-time points, ignoring age-filtered (flagged)
// buckets. Used for a single per-board summary cell.
function medianCycle(points: SeriesPoint[]): number | null {
  const vals = points
    .filter((p) => !p.flagged && typeof p.cycle_days === 'number')
    .map((p) => p.cycle_days as number)
    .sort((a, b) => a - b);
  if (vals.length === 0) return null;
  const mid = Math.floor(vals.length / 2);
  const m = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  return Math.round(m * 10) / 10;
}

function totalDelivered(points: SeriesPoint[]): number {
  return points.reduce((n, p) => n + p.delivered, 0);
}

export default function CompareFlowWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<Data>(boardId, 'COMPARE_FLOW', merged);
  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (data.boards.length === 0)
    return (
      <p className="text-sm text-slate-500 p-2">Add boards to compare using the board picker.</p>
    );

  const { boards, comparability } = data;
  const columns = boards.map((b) => ({ boardId: b.boardId, boardName: b.boardName }));

  // One cycle-time line per board.
  const cycleSeries = boards.map((b, i) => ({
    name: b.boardName,
    color: boardColor(i),
    points: b.series.map((s) => ({ x: s.period, y: s.cycle_days ?? 0 })),
  }));
  const hasSeries = boards.some((b) => b.series.length > 0);

  const rows: ScorecardRow[] = [
    {
      key: 'cycle_days',
      label: 'Median cycle time (days, lower is better)',
      direction: 'lower_is_better',
      flag: comparability.cycle_days,
      cells: boards.map((b) => {
        const m = medianCycle(b.series);
        return { display: m === null ? '—' : `${m} d`, raw: m };
      }),
    },
    {
      key: 'delivered',
      label: 'Items delivered (volume)',
      direction: 'higher_is_better',
      flag: comparability.delivered,
      cells: boards.map((b) => fmtNum(totalDelivered(b.series))),
    },
  ];

  return (
    <div className="flex flex-col h-full w-full gap-3">
      <div className="flex-1 min-h-0">
        {hasSeries ? (
          <TrendLineChart series={cycleSeries} yAxisLabel="cycle days" />
        ) : (
          <p className="text-xs text-slate-400 px-1">No delivered items in the selected period.</p>
        )}
      </div>
      <div className="shrink-0">
        <CompareScorecardTable columns={columns} rows={rows} />
      </div>
    </div>
  );
}
