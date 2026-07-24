'use client';

import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Engineer {
  name: string;
  avgDays: number;
  completedCount: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function VelocityLeaderboardWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<{ engineers: Engineer[]; days: number }>(boardId, 'VELOCITY_LEADERBOARD', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.engineers.length === 0)
    return (
      <p className="text-sm text-slate-400">No completions in the last {data.days} days</p>
    );

  return (
    <div className="space-y-2">
      {data.engineers.map((eng, i) => (
        <div
          key={eng.name}
          className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50"
        >
          <span
            className={`text-sm font-bold w-6 text-center ${
              i === 0
                ? 'text-amber-500'
                : i === 1
                  ? 'text-slate-400'
                  : i === 2
                    ? 'text-amber-700'
                    : 'text-slate-300'
            }`}
          >
            #{i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{eng.name}</p>
            <p className="text-xs text-slate-400">{eng.completedCount} completed</p>
          </div>
          <span className="text-sm font-semibold text-indigo-600">{eng.avgDays}d avg</span>
        </div>
      ))}
    </div>
  );
}
