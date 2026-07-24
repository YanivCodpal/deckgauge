'use client';
import { TrendLineChart } from '../charts/TrendLineChart';
import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';
import {
  CompareScorecardTable,
  boardColor,
  fmtPct,
  fmtHrs,
  fmtNum,
  type ComparabilityFlag,
  type ScorecardRow,
} from './comparison-shared';

interface Props {
  boardId: string; // carries the comparison id
  config: Record<string, unknown>;
}

interface TrendPoint {
  period: string;
  coverage_pct: number | null;
  comment_pct: number | null;
  sample: number;
}

interface Scorecard {
  coverage_pct: number | null;
  median_open_h: number | null;
  instant_pct: number | null;
  comment_pct: number | null;
  ticket_pct: number | null;
  merged_prs: number;
}

interface Board {
  boardId: string;
  boardName: string;
  effectiveDevHeadcount: number | null;
  scorecard: Scorecard;
  trend: TrendPoint[];
  emptyReason?: string;
}

interface Data {
  boards: Board[];
  comparability: {
    coverage_pct: ComparabilityFlag;
    median_open_h: ComparabilityFlag;
    comment_pct: ComparabilityFlag;
    merged_prs: ComparabilityFlag;
  };
}

const COMPARABLE_TRUE: ComparabilityFlag = { comparable: true };

export default function CompareReviewQualityWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<Data>(boardId, 'COMPARE_REVIEW_QUALITY', merged);
  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (data.boards.length === 0)
    return (
      <p className="text-sm text-slate-500 p-2">Add boards to compare using the board picker.</p>
    );

  const { boards, comparability } = data;
  const columns = boards.map((b) => ({ boardId: b.boardId, boardName: b.boardName }));

  // One coverage-% line per board.
  const coverageSeries = boards.map((b, i) => ({
    name: b.boardName,
    color: boardColor(i),
    points: b.trend.map((t) => ({ x: t.period, y: t.coverage_pct ?? 0 })),
  }));
  const hasTrend = boards.some((b) => b.trend.length > 0);

  const rows: ScorecardRow[] = [
    {
      key: 'coverage_pct',
      label: 'Peer approval before merge (coverage)',
      direction: 'higher_is_better',
      flag: comparability.coverage_pct,
      cells: boards.map((b) => fmtPct(b.scorecard.coverage_pct)),
    },
    {
      key: 'median_open_h',
      label: 'Review takes real time (median PR open)',
      direction: 'higher_is_better',
      flag: comparability.median_open_h,
      cells: boards.map((b) => fmtHrs(b.scorecard.median_open_h)),
    },
    {
      key: 'comment_pct',
      label: 'Reviews that left a written comment',
      direction: 'higher_is_better',
      flag: comparability.comment_pct,
      cells: boards.map((b) => fmtPct(b.scorecard.comment_pct)),
    },
    {
      key: 'ticket_pct',
      label: 'Merged PRs referencing a ticket',
      direction: 'higher_is_better',
      flag: COMPARABLE_TRUE,
      cells: boards.map((b) => fmtPct(b.scorecard.ticket_pct)),
    },
    {
      key: 'merged_prs',
      label: 'Merged PRs (volume)',
      direction: 'higher_is_better',
      flag: comparability.merged_prs,
      cells: boards.map((b) => fmtNum(b.scorecard.merged_prs)),
    },
  ];

  return (
    <div className="flex flex-col h-full w-full gap-3">
      <div className="flex-1 min-h-0">
        {hasTrend ? (
          <TrendLineChart series={coverageSeries} yAxisLabel="coverage %" />
        ) : (
          <p className="text-xs text-slate-400 px-1">No review data in the selected period.</p>
        )}
      </div>
      <div className="shrink-0">
        <CompareScorecardTable columns={columns} rows={rows} />
      </div>
    </div>
  );
}
