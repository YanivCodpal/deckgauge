'use client';

import { SPLIT_COLORS } from '../lib/classification';
import { formatHours } from '../lib/timesheet-ui';

interface SplitBarProps {
  capexSeconds: number;
  opexSeconds: number;
  unclassifiedSeconds: number;
  /** Show the CapEx % to the right of the bar. */
  showPct?: boolean;
  capexPct?: number;
  className?: string;
}

/**
 * The signature element: a proportional CapEx / OpEx / Unclassified bar.
 * Appears beside each engineer's total and atop the report so the split
 * a VP cares about is legible at a glance, in the same colours, everywhere.
 */
export function SplitBar({
  capexSeconds,
  opexSeconds,
  unclassifiedSeconds,
  showPct = false,
  capexPct,
  className,
}: SplitBarProps) {
  const total = capexSeconds + opexSeconds + unclassifiedSeconds;
  const seg = (s: number) => (total > 0 ? `${(s / total) * 100}%` : '0%');
  const title =
    `CapEx ${formatHours(capexSeconds)} · ` +
    `OpEx ${formatHours(opexSeconds)} · ` +
    `Unclassified ${formatHours(unclassifiedSeconds)}`;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div
        className="flex h-2 w-full min-w-[3rem] overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={title}
        title={title}
      >
        <div style={{ width: seg(capexSeconds), backgroundColor: SPLIT_COLORS.capex }} />
        <div style={{ width: seg(opexSeconds), backgroundColor: SPLIT_COLORS.opex }} />
        <div
          style={{ width: seg(unclassifiedSeconds), backgroundColor: SPLIT_COLORS.unclassified }}
        />
      </div>
      {showPct && (
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">
          {total > 0 ? `${(capexPct ?? 0).toFixed(0)}%` : '—'}
        </span>
      )}
    </div>
  );
}
