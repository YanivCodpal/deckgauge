import type { ProjectStatus } from "@deckgauge/shared";

export interface BoardStatusSegment {
  label: string;
  color: string;
  count: number;
}

interface StatusDistributionBarProps {
  statusCounts: Record<ProjectStatus, number>;
  boardStatusDistribution?: BoardStatusSegment[];
}

const statusColors: Record<ProjectStatus, string> = {
  NOT_STARTED: "bg-slate-500",
  IN_PROGRESS: "bg-cyan-400",
  AT_RISK: "bg-amber-400",
  BLOCKED: "bg-red-400",
  DONE: "bg-emerald-400",
};

export function StatusDistributionBar({ statusCounts, boardStatusDistribution }: StatusDistributionBarProps) {
  if (boardStatusDistribution) {
    const total = boardStatusDistribution.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) return null;

    const segments = boardStatusDistribution.filter((s) => s.count > 0);

    return (
      <div
        data-testid="status-distribution-bar"
        className="flex h-1.5 w-30 overflow-hidden rounded-full"
        style={{ width: "120px" }}
      >
        {segments.map((segment, i) => (
          <div
            key={segment.label}
            data-testid={`board-segment-${i}`}
            className="transition-all duration-200"
            style={{ width: `${(segment.count / total) * 100}%`, backgroundColor: segment.color }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
    );
  }

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return null;
  }

  const segments = (Object.keys(statusCounts) as ProjectStatus[])
    .filter((status) => statusCounts[status] > 0)
    .map((status) => ({
      status,
      count: statusCounts[status],
      percentage: (statusCounts[status] / total) * 100,
    }));

  return (
    <div
      data-testid="status-distribution-bar"
      className="flex h-1.5 w-30 overflow-hidden rounded-full"
      style={{ width: "120px" }}
    >
      {segments.map((segment) => (
        <div
          key={segment.status}
          data-testid={`segment-${segment.status}`}
          className={`${statusColors[segment.status]} transition-all duration-200`}
          style={{ width: `${segment.percentage}%` }}
          title={`${segment.status}: ${segment.count}`}
        />
      ))}
    </div>
  );
}
