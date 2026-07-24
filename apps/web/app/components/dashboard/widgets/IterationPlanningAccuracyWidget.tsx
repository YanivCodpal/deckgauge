'use client';
import { TrendBarChart } from '../charts/TrendBarChart';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

interface Data {
  sprints: Array<{
    iteration_name: string;
    completed: number;
    committed: number;
    accuracy_pct: number;
  }>;
  emptyReason?: string;
}

export default function IterationPlanningAccuracyWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<Data>(boardId, 'ITERATION_PLANNING_ACCURACY', config);
  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  if (data.emptyReason === 'no_sprintable_source')
    return (
      <p className="text-sm text-slate-500 p-2">
        Planning Accuracy needs a Jira or Azure DevOps source — GitHub and GitLab issues don&apos;t
        have sprints. Attach one in the{' '}
        <a className="underline" href="../sources">
          Sources tab
        </a>
        .
      </p>
    );
  if (data.emptyReason)
    return (
      <p className="text-sm text-slate-500 p-2">
        Connect a source in{' '}
        <a className="underline" href="../sources">
          Sources tab
        </a>
        .
      </p>
    );
  return (
    <TrendBarChart
      yAxisLabel="%"
      targetLine={{ value: 80, label: 'Target 80%' }}
      series={[
        {
          name: 'Accuracy',
          points: data.sprints.map((s) => ({ x: s.iteration_name, y: s.accuracy_pct })),
          color: '#4f46e5',
        },
      ]}
    />
  );
}
