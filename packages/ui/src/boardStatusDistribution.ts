import type { BoardStatus } from "@deckgauge/shared";
import type { BoardStatusSegment } from "./StatusDistributionBar";

/**
 * Computes status distribution segments for the StatusDistributionBar.
 *
 * Items with statusId === null are grouped into an "Unassigned" segment so
 * that the bar total always matches the group's item count.
 */
export function computeBoardStatusDistribution(
  projects: Array<{ statusId: string | null }>,
  boardStatuses: BoardStatus[],
): BoardStatusSegment[] {
  const distribution: BoardStatusSegment[] = boardStatuses.map((bs) => ({
    label: bs.label,
    color: bs.color,
    count: projects.filter((p) => p.statusId === bs.id).length,
  }));

  const unassignedCount = projects.filter((p) => p.statusId == null).length;
  if (unassignedCount > 0) {
    distribution.push({
      label: "Unassigned",
      color: "#C4C4C4",
      count: unassignedCount,
    });
  }

  return distribution;
}
