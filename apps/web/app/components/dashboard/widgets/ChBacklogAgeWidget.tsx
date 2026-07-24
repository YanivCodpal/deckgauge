'use client';

import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';


interface Bucket {
  label: string;
  count: number;
}

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-7d': '#10b981',
  '7-30d': '#6366f1',
  '30-90d': '#f59e0b',
  '90d+': '#ef4444',
};

export default function ChBacklogAgeWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<{ buckets: Bucket[] }>(boardId, 'CH_BACKLOG_AGE', config);

  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading...</p>;
  const total = data.buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0)
    return (
      <p className="text-sm text-slate-400">
        No data — connect Jira/GitHub sources in Settings
      </p>
    );

  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Open Jira issues by age — {total} total</p>
      <div className="space-y-1.5">
        {data.buckets.map((b) => {
          const widthPct = (b.count / maxCount) * 100;
          return (
            <div key={b.label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 w-14">{b.label}</span>
              <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: BUCKET_COLORS[b.label] ?? '#6366f1',
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                {b.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
