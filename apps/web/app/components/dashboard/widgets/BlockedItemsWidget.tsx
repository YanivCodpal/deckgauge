'use client';

import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';


interface Item {
  projectId: string;
  name: string;
  owner: string;
  daysBlocked: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

export default function BlockedItemsWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<{ items: Item[] }>(boardId, 'BLOCKED_ITEMS', config);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  if (data.items.length === 0) return <p className="text-sm text-green-500">No blocked items</p>;

  return (
    <div className="space-y-1">
      {data.items.map((item) => (
        <div
          key={item.projectId}
          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-red-50/50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
            <p className="text-xs text-slate-400">{item.owner}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {item.daysBlocked}d
          </span>
        </div>
      ))}
    </div>
  );
}
