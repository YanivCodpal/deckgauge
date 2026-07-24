import type { ProjectStatus } from "@deckgauge/shared";

const statusConfig: Record<
  ProjectStatus,
  { icon: string; label: string; bg: string }
> = {
  NOT_STARTED: { icon: "\u25CB", label: "Not started", bg: "bg-status-not-started-bg" },
  IN_PROGRESS: { icon: "\u25D1", label: "In progress", bg: "bg-status-in-progress-bg" },
  AT_RISK: { icon: "\u26A0", label: "At risk", bg: "bg-status-at-risk-bg" },
  BLOCKED: { icon: "\u2297", label: "Blocked", bg: "bg-status-blocked-bg" },
  DONE: { icon: "\u2713", label: "Done", bg: "bg-status-done-bg" },
};

interface StatusPillProps {
  status: ProjectStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`flex items-center justify-center gap-1 w-full rounded-sm px-2 py-1.5 text-xs font-semibold text-white whitespace-nowrap ${config.bg}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
