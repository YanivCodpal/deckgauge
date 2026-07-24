'use client';
import { useDroppable } from '@dnd-kit/core';
import { RoadmapAssigneeRow } from './RoadmapAssigneeRow';
import { LANE_LABEL_WIDTH } from './geometry';
import type { ScheduledBar } from '@deckgauge/shared';

interface LaneProject {
  id: string;
  name: string;
  groupId: string | null;
  order: number | null;
  assigneeId: string | null;
  sizeLabel: string | null;
  sizeWeeks: number | null;
  status: string;
}

interface RoadmapGroupLaneProps {
  group: { id: string; name: string; color: string; position: number };
  projects: LaneProject[];
  schedule: Map<string, ScheduledBar>;
  viewStart: Date;
  /** width of the timeline area (px), so the lane spans the full grid */
  timelineWidth: number;
  readOnly: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onResize?: (id: string, endDate: Date) => void;
  onResizePreview?: (x: number | null, date: Date | null) => void;
}

const UNASSIGNED = '__unassigned__';

export function RoadmapGroupLane(props: RoadmapGroupLaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: props.group.id });
  const { color } = props.group;

  const byAssignee = new Map<string, LaneProject[]>();
  for (const p of props.projects) {
    const key = p.assigneeId ?? UNASSIGNED;
    const existing = byAssignee.get(key);
    byAssignee.set(key, existing !== undefined ? [...existing, p] : [p]);
  }
  const chains = Array.from(byAssignee.entries());

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        width: LANE_LABEL_WIDTH + props.timelineWidth,
        background: isOver ? `${color}1f` : `${color}0d`,
        outline: isOver ? `2px dashed ${color}` : undefined,
        outlineOffset: -2,
        transition: 'background 150ms',
      }}
    >
      {/* Sticky lane label */}
      <div
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 3,
          flex: `0 0 ${LANE_LABEL_WIDTH}px`,
          width: LANE_LABEL_WIDTH,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 12px',
          background: `linear-gradient(90deg, ${color}26, ${color}14)`,
          borderRight: '1px solid rgba(15,23,42,0.08)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <span
          aria-hidden
          style={{ width: 5, alignSelf: 'stretch', margin: '8px 0', borderRadius: 9999, background: color }}
        />
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {props.group.name}
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {props.projects.length} {props.projects.length === 1 ? 'item' : 'items'}
          </span>
        </span>
      </div>

      {/* Timeline tracks */}
      <div style={{ position: 'relative', flex: `0 0 ${props.timelineWidth}px`, width: props.timelineWidth }}>
        {chains.map(([assigneeKey, projects], i) => (
          <RoadmapAssigneeRow
            key={assigneeKey}
            projects={projects}
            schedule={props.schedule}
            color={color}
            viewStart={props.viewStart}
            readOnly={props.readOnly}
            divider={i > 0}
            onOpen={props.onOpen}
            onRename={props.onRename}
            onResize={props.onResize}
            onResizePreview={props.onResizePreview}
          />
        ))}
      </div>
    </div>
  );
}
