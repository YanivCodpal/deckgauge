'use client';
import { RoadmapBar } from './RoadmapBar';
import { ROW_HEIGHT } from './geometry';
import type { ScheduledBar } from '@deckgauge/shared';

interface RowProject {
  id: string;
  name: string;
  groupId: string | null;
}

interface RoadmapAssigneeRowProps {
  projects: RowProject[];
  schedule: Map<string, ScheduledBar>;
  color: string;
  viewStart: Date;
  readOnly: boolean;
  /** draw a hairline divider above this row (between stacked assignee tracks) */
  divider?: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onResize?: (id: string, endDate: Date) => void;
  onResizePreview?: (x: number | null, date: Date | null) => void;
}

export function RoadmapAssigneeRow(props: RoadmapAssigneeRowProps) {
  return (
    <div
      data-testid="assignee-row"
      style={{
        position: 'relative',
        height: ROW_HEIGHT,
        borderTop: props.divider ? '1px solid rgba(15,23,42,0.06)' : undefined,
      }}
    >
      {props.projects.map((p) => {
        const bar = props.schedule.get(p.id);
        if (!bar) return null;
        return (
          <RoadmapBar
            key={p.id}
            id={p.id}
            title={p.name}
            startDate={bar.startDate}
            endDate={bar.endDate}
            color={props.color}
            isUnsized={bar.isUnsized}
            isPinned={bar.isPinned}
            viewStart={props.viewStart}
            groupId={p.groupId}
            readOnly={props.readOnly}
            onOpen={props.onOpen}
            onRename={props.onRename}
            onResize={props.onResize}
            onResizePreview={props.onResizePreview}
          />
        );
      })}
    </div>
  );
}
