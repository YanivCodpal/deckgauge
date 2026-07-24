'use client';

import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function CompletionRateWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<{ total: number; completed: number; rate: number }>(boardId, 'COMPLETION_RATE', merged);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;

  const percentage = Math.round(data.rate * 100);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-4xl font-bold text-indigo-600">{percentage}%</span>
      <span className="text-sm text-slate-400 mt-1">
        {data.completed} of {data.total} completed
      </span>
    </div>
  );
}
