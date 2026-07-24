import { computeSchedule } from '@deckgauge/shared';
import type { ScheduleProject } from '@deckgauge/shared';

interface WireInput {
  groups: { id: string }[];
  projects: (Omit<ScheduleProject, 'startDate' | 'endDate'> & {
    startDate: string | null;
    endDate: string | null;
  })[];
  config: {
    startDate: string;
    sizeDurations: Record<string, number>;
    defaultSizeWeeks: number;
  };
}

self.onmessage = (e: MessageEvent<WireInput>) => {
  const { groups, projects, config } = e.data;
  const out = computeSchedule({
    groups,
    projects: projects.map((p) => ({
      ...p,
      startDate: p.startDate ? new Date(p.startDate) : null,
      endDate: p.endDate ? new Date(p.endDate) : null,
    })),
    config: {
      startDate: new Date(config.startDate),
      sizeDurations: config.sizeDurations as never,
      defaultSizeWeeks: config.defaultSizeWeeks,
    },
  });
  const wire = Array.from(out.entries()).map(([id, b]) => [
    id,
    {
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      isUnsized: b.isUnsized,
      isPinned: b.isPinned,
    },
  ]);
  (self as unknown as Worker).postMessage({ schedule: wire });
};
