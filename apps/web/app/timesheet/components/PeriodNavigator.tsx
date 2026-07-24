'use client';

interface PeriodNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

/** ‹ Period › navigator with a live, centred date label (Tempo-style). */
export function PeriodNavigator({ label, onPrev, onNext }: PeriodNavigatorProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        aria-label="previous period"
        onClick={onPrev}
        className="rounded-l-lg px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        ‹
      </button>
      <span className="min-w-[9rem] select-none px-2 text-center text-sm font-medium tabular-nums text-slate-700">
        {label}
      </span>
      <button
        type="button"
        aria-label="next period"
        onClick={onNext}
        className="rounded-r-lg px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        ›
      </button>
    </div>
  );
}
