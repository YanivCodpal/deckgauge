'use client';

import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Week {
  week_start: string;
  prs: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD = 16;

export default function ChVelocityWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<{ weeks: Week[] }>(boardId, 'CH_VELOCITY', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.weeks.length === 0)
    return (
      <p className="text-sm text-slate-400">
        No data — connect Jira/GitHub sources in Settings
      </p>
    );

  const maxPrs = Math.max(...data.weeks.map((w) => w.prs), 1);
  const barW = (VIEW_W - PAD * 2) / Math.max(data.weeks.length, 1);
  const innerW = barW * 0.7;
  const innerGap = barW - innerW;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">PRs merged per week — last {data.weeks.length} week(s)</p>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        {data.weeks.map((w, i) => {
          const x = PAD + barW * i + innerGap / 2;
          const h = (w.prs / maxPrs) * (VIEW_H - PAD * 2);
          const y = VIEW_H - PAD - h;
          return (
            <rect
              key={w.week_start}
              x={x}
              y={y}
              width={innerW}
              height={h}
              fill="#10b981"
              rx={1.5}
            />
          );
        })}
      </svg>
      <p className="text-xs text-slate-500">
        Total: {data.weeks.reduce((sum, w) => sum + w.prs, 0)} • Peak: {maxPrs}
      </p>
    </div>
  );
}
