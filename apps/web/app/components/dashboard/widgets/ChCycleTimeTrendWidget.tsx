'use client';

import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Week {
  week_start: string;
  p50_hours: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD = 16;

export default function ChCycleTimeTrendWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<{ weeks: Week[] }>(boardId, 'CH_CYCLE_TIME_TREND', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.weeks.length === 0)
    return (
      <p className="text-sm text-slate-400">
        No data — connect Jira/GitHub sources in Settings
      </p>
    );

  const maxHours = Math.max(...data.weeks.map((w) => w.p50_hours), 1);
  const stepX = data.weeks.length > 1 ? (VIEW_W - PAD * 2) / (data.weeks.length - 1) : 0;

  const pathD = data.weeks
    .map((w, i) => {
      const x = PAD + stepX * i;
      const y = VIEW_H - PAD - (w.p50_hours / maxHours) * (VIEW_H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const latest = data.weeks[data.weeks.length - 1];

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Median PR cycle time (h) — last {data.weeks.length} week(s)
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={2} />
        {data.weeks.map((w, i) => {
          const x = PAD + stepX * i;
          const y = VIEW_H - PAD - (w.p50_hours / maxHours) * (VIEW_H - PAD * 2);
          return <circle key={w.week_start} cx={x} cy={y} r={2.5} fill="#f59e0b" />;
        })}
      </svg>
      <p className="text-xs text-slate-500">
        Latest: {latest.p50_hours.toFixed(1)}h • Peak: {maxHours.toFixed(1)}h
      </p>
    </div>
  );
}
