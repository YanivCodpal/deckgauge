'use client';

import { useMemo } from 'react';
import { DndContext } from '@dnd-kit/core';
import type { RoadmapDetail } from '@deckgauge/shared';
import {
  computeSchedule,
  DEFAULT_SIZE_DURATIONS,
  DEFAULT_SIZE_WEEKS,
} from '@deckgauge/shared';
import { RoadmapGroupLane } from '../roadmap/RoadmapGroupLane';
import { RoadmapHeader } from '../roadmap/RoadmapHeader';
import { TodayLine } from '../roadmap/TodayLine';
import {
  LANE_LABEL_WIDTH,
  quartersFrom,
  timelineWidthPx,
  daysBetween,
  quarterCount,
} from '../roadmap/geometry';

// Default timeline: start from today, show 4 quarters.
const DEFAULT_VISIBLE_QUARTERS = 4;

interface RoadmapEntityGanttProps {
  detail: RoadmapDetail;
}

/**
 * Read-only Gantt view for a cross-board Roadmap.
 *
 * Reuses the in-board RoadmapGroupLane / RoadmapBar canvas components.
 * Each lane is labelled with the group's home boardName (cross-board
 * distinction). Uses DEFAULT_SIZE_DURATIONS / DEFAULT_SIZE_WEEKS because
 * RoadmapDetail carries no per-roadmap gantt config — noted as a gap if
 * a future task wires up RoadmapGanttConfig to the cross-board payload.
 */
export function RoadmapEntityGantt({ detail }: RoadmapEntityGanttProps) {
  const viewStart = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }, []);

  const scheduleConfig = useMemo(
    () => ({
      startDate: viewStart,
      sizeDurations: DEFAULT_SIZE_DURATIONS,
      defaultSizeWeeks: DEFAULT_SIZE_WEEKS,
    }),
    [viewStart],
  );

  // Flatten all items from all groups into ScheduleProject inputs.
  const scheduleProjects = useMemo(
    () =>
      detail.groups.flatMap((g) =>
        g.items.map((item) => ({
          id: item.id,
          groupId: item.groupId,
          order: item.order,
          assigneeId: item.ownerId,
          sizeWeeks: item.sizeWeeks,
          sizeLabel: item.sizeLabel,
          durationCode: item.durationCode,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
        })),
      ),
    [detail.groups],
  );

  const scheduleGroups = useMemo(
    () => detail.groups.map((g) => ({ id: g.groupId })),
    [detail.groups],
  );

  const schedule = useMemo(
    () =>
      computeSchedule({
        groups: scheduleGroups,
        projects: scheduleProjects,
        config: scheduleConfig,
      }),
    [scheduleGroups, scheduleProjects, scheduleConfig],
  );

  // Expand the quarter count to cover all scheduled work so no bar is clipped.
  const maxEndDays = useMemo(() => {
    let m = 0;
    for (const bar of schedule.values()) {
      m = Math.max(m, daysBetween(viewStart, bar.endDate));
    }
    return m;
  }, [schedule, viewStart]);

  const quarters = useMemo(
    () =>
      quartersFrom(
        viewStart,
        quarterCount(DEFAULT_VISIBLE_QUARTERS, maxEndDays),
      ),
    [viewStart, maxEndDays],
  );

  const tlWidth = useMemo(() => timelineWidthPx(quarters), [quarters]);

  // Sort groups by position.
  const sortedGroups = useMemo(
    () => [...detail.groups].sort((a, b) => a.position - b.position),
    [detail.groups],
  );

  if (scheduleProjects.length === 0) {
    return (
      <div
        style={{ padding: 64, textAlign: 'center', color: '#64748b', fontSize: 14 }}
      >
        Add items to groups to see them on the Gantt.
      </div>
    );
  }

  return (
    // DndContext is required by RoadmapGroupLane (useDroppable) and
    // RoadmapBar (useDraggable). We pass no handlers — the view is read-only.
    <DndContext>
      <div
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 180px)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#ffffff',
        }}
      >
        <RoadmapHeader
          quarters={quarters}
          timelineWidth={tlWidth}
          visibleQuarters={DEFAULT_VISIBLE_QUARTERS}
          onChangeVisibleQuarters={() => undefined}
        />

        <div style={{ position: 'relative', width: LANE_LABEL_WIDTH + tlWidth }}>
          {/* Quarter gridlines */}
          {quarters.map((q, i) =>
            i === 0 ? null : (
              <div
                key={q.label}
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: LANE_LABEL_WIDTH + q.x,
                  width: 1,
                  background: '#eef2f7',
                  zIndex: 0,
                }}
              />
            ),
          )}

          <TodayLine viewStart={viewStart} />

          {sortedGroups.map((g) => {
            // Items for this lane, mapped to the shape RoadmapGroupLane expects.
            const laneProjects = g.items.map((item) => ({
              id: item.id,
              name: item.name,
              groupId: item.groupId,
              order: item.order,
              // ownerId is the assigneeId key used for parallel tracks
              assigneeId: item.ownerId,
              sizeLabel: item.sizeLabel,
              sizeWeeks: item.sizeWeeks,
              status: item.status,
            }));

            // Use boardName as the lane label so cross-board origin is clear.
            const laneGroup = {
              id: g.groupId,
              name: g.boardName,
              color: g.color,
              position: g.position,
            };

            return (
              <RoadmapGroupLane
                key={g.groupId}
                group={laneGroup}
                projects={laneProjects}
                schedule={schedule}
                viewStart={viewStart}
                timelineWidth={tlWidth}
                readOnly
                onOpen={() => undefined}
                onRename={() => undefined}
              />
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
