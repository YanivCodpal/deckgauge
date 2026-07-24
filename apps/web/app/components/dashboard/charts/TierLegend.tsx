'use client';
import { tierFor, type BenchmarkConfig, type Tier } from '@deckgauge/shared';

const TIER_TEXT: Record<Tier, string> = {
  elite: 'text-emerald-700 bg-emerald-100',
  high:  'text-lime-700 bg-lime-50',
  medium:'text-amber-700 bg-amber-50',
  low:   'text-rose-700 bg-rose-50',
};

interface Props { config: BenchmarkConfig; currentValue?: number }

export function TierLegend({ config, currentValue }: Props) {
  const current = currentValue == null ? null : tierFor(currentValue, config);
  const tiers: Tier[] = ['elite', 'high', 'medium', 'low'];
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {tiers.map((t) => (
        <span
          key={t}
          data-current={current === t ? 'true' : undefined}
          className={`rounded px-1.5 py-0.5 ${TIER_TEXT[t]} ${current === t ? 'ring-1 ring-current' : 'opacity-70'}`}
        >
          {t[0]!.toUpperCase() + t.slice(1)}
        </span>
      ))}
      <span className="text-[10px] text-slate-400 ml-auto">Tier reference: DX 2025 industry benchmarks</span>
    </div>
  );
}
