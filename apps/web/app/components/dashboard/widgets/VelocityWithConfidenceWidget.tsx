'use client';
import { TrendLineChart } from '../charts/TrendLineChart';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

type EmptyReason = 'no_issue_source' | 'no_sprintable_source' | 'no_sprint_data';

interface Data {
  sprints: Array<{
    sprint_name: string;
    completed: number;
    lower: number;
    upper: number;
  }>;
  emptyReason?: EmptyReason | string;
}

function EmptyState({ reason }: { reason: EmptyReason | string | undefined }) {
  if (reason === 'no_sprintable_source') {
    return (
      <p className="text-sm text-slate-500 p-2">
        Velocity needs a Jira or Azure DevOps source — GitHub and GitLab issues
        don&apos;t have sprints. Attach one in the{' '}
        <a className="underline" href="../sources">
          Sources tab
        </a>
        .
      </p>
    );
  }
  if (reason === 'no_sprint_data') {
    return (
      <p className="text-sm text-slate-500 p-2">
        No sprint data yet. Velocity appears once issues are assigned to sprints
        and the intelligence sync has run.
      </p>
    );
  }
  return (
    <p className="text-sm text-slate-500 p-2">
      Connect a source in{' '}
      <a className="underline" href="../sources">
        Sources tab
      </a>
      .
    </p>
  );
}

export default function VelocityWithConfidenceWidget({ boardId, config }: Props) {
  const { data, error } = useWidgetData<Data>(boardId, 'VELOCITY_WITH_CONFIDENCE', config);
  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  // Defense in depth: treat an empty sprints array as no_sprint_data even when
  // the backend forgets to set emptyReason. Without this the chart renders
  // axes with no line, which reads as a broken widget.
  if (data.emptyReason || data.sprints.length === 0) {
    return <EmptyState reason={data.emptyReason ?? 'no_sprint_data'} />;
  }
  return (
    <TrendLineChart
      yAxisLabel="issues"
      series={[
        {
          name: 'completed',
          points: data.sprints.map((s) => ({ x: s.sprint_name, y: s.completed })),
        },
      ]}
      confidenceBand={{
        lower: data.sprints.map((s) => s.lower),
        upper: data.sprints.map((s) => s.upper),
      }}
    />
  );
}
