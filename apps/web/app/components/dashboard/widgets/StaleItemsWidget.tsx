'use client';

import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';


interface Item {
  projectId: string;
  name: string;
  owner: string;
  daysSinceUpdate: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function StaleItemsWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<{ items: Item[]; thresholdDays: number }>(boardId, 'STALE_ITEMS', config);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.items.length === 0)
    return <p className="text-sm text-green-500">All items are active</p>;

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400 mb-2">Not updated in &gt; {data.thresholdDays} days</p>
      {data.items.map((item) => (
        <div
          key={item.projectId}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
            <p className="text-xs text-slate-400">{item.owner}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {item.daysSinceUpdate}d idle
          </span>
        </div>
      ))}
    </div>
  );
}
