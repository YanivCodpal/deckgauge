'use client';
import { useEffect, useState } from 'react';
import { computeSchedule } from '@deckgauge/shared';
import type {
  ScheduleGroup,
  ScheduleProject,
  ScheduleConfig,
  ScheduledBar,
} from '@deckgauge/shared';

export const WORKER_THRESHOLD = 1500;

export interface ScheduleInput {
  groups: ScheduleGroup[];
  projects: ScheduleProject[];
  config: ScheduleConfig;
}

const EMPTY = new Map<string, ScheduledBar>();

export function useScheduleWorker(
  input: ScheduleInput | null,
): { schedule: Map<string, ScheduledBar>; computing: boolean; progress: number } {
  const [schedule, setSchedule] = useState<Map<string, ScheduledBar>>(EMPTY);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!input) {
      setSchedule(EMPTY);
      return;
    }

    const runInline = () => {
      setSchedule(computeSchedule(input));
      setComputing(false);
    };

    if (
      input.projects.length <= WORKER_THRESHOLD ||
      typeof Worker === 'undefined'
    ) {
      runInline();
      return;
    }

    setComputing(true);
    setProgress(0.1);
    let cancelled = false;
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./schedule.worker.ts', import.meta.url));
      worker.onmessage = (
        e: MessageEvent<{
          schedule: [
            string,
            {
              startDate: string;
              endDate: string;
              isUnsized: boolean;
              isPinned: boolean;
            },
          ][];
        }>,
      ) => {
        if (cancelled) return;
        const map = new Map<string, ScheduledBar>(
          e.data.schedule.map(([id, b]) => [
            id,
            {
              startDate: new Date(b.startDate),
              endDate: new Date(b.endDate),
              isUnsized: b.isUnsized,
              isPinned: b.isPinned,
            },
          ]),
        );
        setSchedule(map);
        setComputing(false);
        setProgress(1);
      };
      worker.onerror = () => {
        if (!cancelled) runInline();
      };
      worker.postMessage({
        groups: input.groups,
        projects: input.projects.map((p) => ({
          ...p,
          startDate: p.startDate ? p.startDate.toISOString() : null,
          endDate: p.endDate ? p.endDate.toISOString() : null,
        })),
        config: {
          startDate: input.config.startDate.toISOString(),
          sizeDurations: input.config.sizeDurations,
          defaultSizeWeeks: input.config.defaultSizeWeeks,
        },
      });
    } catch {
      runInline();
    }

    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [input]);

  return { schedule, computing, progress };
}
