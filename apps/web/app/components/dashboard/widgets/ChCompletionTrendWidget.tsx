'use client';

import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Point {
  date: string;
  count: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD = 16;

export default function ChCompletionTrendWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<{ points: Point[] }>(boardId, 'CH_COMPLETION_TREND', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.points.length === 0)
    return (
      <p className="text-sm text-slate-400">
        No data — connect Jira/GitHub sources in Settings
      </p>
    );

  const maxCount = Math.max(...data.points.map((p) => p.count), 1);
  const stepX = data.points.length > 1 ? (VIEW_W - PAD * 2) / (data.points.length - 1) : 0;

  const pathD = data.points
    .map((p, i) => {
      const x = PAD + stepX * i;
      const y = VIEW_H - PAD - (p.count / maxCount) * (VIEW_H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Completed Jira issues — last {data.points.length} day(s)
      </p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} />
        {data.points.map((p, i) => {
          const x = PAD + stepX * i;
          const y = VIEW_H - PAD - (p.count / maxCount) * (VIEW_H - PAD * 2);
          return <circle key={p.date} cx={x} cy={y} r={2.5} fill="#6366f1" />;
        })}
      </svg>
      <p className="text-xs text-slate-500">
        Total: {data.points.reduce((sum, p) => sum + p.count, 0)} • Peak: {maxCount}
      </p>
    </div>
  );
}
