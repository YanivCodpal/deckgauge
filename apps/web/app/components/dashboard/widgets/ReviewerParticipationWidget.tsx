'use client';
import { SortableTable } from '../charts/SortableTable';
import { useWidgetConfigWithBoardPeriod } from '../useWidgetConfigWithBoardPeriod';
import { useWidgetData } from './useWidgetData';
import { WidgetErrorState } from './WidgetErrorState';

interface Props {
  boardId: string;
  config: Record<string, unknown>;
}

interface Row {
  reviewer: string;
  provider: string;
  reviews_given: number;
  approvals: number;
}

interface Data {
  rows: Row[];
  emptyReason?: string;
}

export default function ReviewerParticipationWidget({ boardId, config }: Props) {
  const merged = useWidgetConfigWithBoardPeriod(config);
  const { data, error } = useWidgetData<Data>(boardId, 'REVIEWER_PARTICIPATION', merged);
  if (error) return <WidgetErrorState />;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
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
    <SortableTable<Row>
      rows={data.rows}
      defaultSortKey="reviews_given"
      columns={[
        { key: 'reviewer', label: 'Reviewer', sortable: true },
        { key: 'provider', label: 'Source', sortable: true },
        { key: 'reviews_given', label: 'Reviews', sortable: true, align: 'right' },
        { key: 'approvals', label: 'Approvals', sortable: true, align: 'right' },
      ]}
    />
  );
}
