'use client';

import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';


interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function TotalCountWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<{ count: number }>(boardId, 'TOTAL_COUNT', config);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-5xl font-bold text-slate-800">{data.count}</span>
      <span className="text-sm text-slate-400 mt-1">
        {config.statusFilter
          ? String(config.statusFilter).replace('_', ' ').toLowerCase()
          : 'total'}{' '}
        items
      </span>
    </div>
  );
}
