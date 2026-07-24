'use client';
import { BENCHMARKS_V1, type Tier } from '@deckgauge/shared';
import { TrendLineChart } from '../charts/TrendLineChart';
import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

interface Data {
  weeks: Array<{ week_start: string; p50_hours: number; tier: Tier }>;
  emptyReason?: string;
}

export default function LeadTimeForChangesWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<Data>(boardId, 'LEAD_TIME_FOR_CHANGES', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (data.emptyReason) {
    return (
      <p className="text-sm text-slate-500 p-2">
        Connect a source in{' '}
        <a className="underline" href="../sources">
          Sources tab
        </a>{' '}
        to populate Lead Time.
      </p>
    );
  }
  return (
    <TrendLineChart
      series={[
        {
          name: 'p50 hours',
          points: data.weeks.map((w) => ({ x: w.week_start, y: w.p50_hours })),
        },
      ]}
      yAxisLabel="hours"
      benchmarks={BENCHMARKS_V1.LEAD_TIME_FOR_CHANGES}
    />
  );
}
