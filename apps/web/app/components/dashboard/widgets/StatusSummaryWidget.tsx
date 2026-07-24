'use client';

import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';


interface StatusItem {
  label: string;
  count: number;
  color: string;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function StatusSummaryWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<{ statuses: StatusItem[] }>(boardId, 'STATUS_SUMMARY', config);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="flex items-center justify-center gap-4 h-full flex-wrap">
      {data.statuses.map((status) => (
        <div key={status.label} className="flex flex-col items-center px-4 py-2">
          <span className="text-3xl font-bold" style={{ color: status.color }}>
            {status.count}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{status.label}</span>
        </div>
      ))}
    </div>
  );
}
