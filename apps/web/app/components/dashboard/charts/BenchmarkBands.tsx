'use client';
import { ReferenceArea } from 'recharts';
import type { BenchmarkConfig } from '@deckgauge/shared';

interface Props { config: BenchmarkConfig; yMax?: number }

const FILL = {
  elite: 'rgba(16, 185, 129, 0.10)',
  high:  'rgba(132, 204, 22, 0.08)',
  medium:'rgba(245, 158, 11, 0.08)',
  low:   'rgba(244, 63, 94, 0.08)',
} as const;

export function BenchmarkBands({ config, yMax }: Props) {
  const top = yMax ?? config.medium * 3;
  const clamp = (v: number) => Math.min(Math.max(v, 0), top);
  const ranges =
    config.direction === 'lower_is_better'
      ? [
          { y1: 0, y2: clamp(config.elite), fill: FILL.elite },
          { y1: clamp(config.elite), y2: clamp(config.high), fill: FILL.high },
          { y1: clamp(config.high), y2: clamp(config.medium), fill: FILL.medium },
          { y1: clamp(config.medium), y2: top, fill: FILL.low },
        ]
      : [
          { y1: 0, y2: clamp(config.medium), fill: FILL.low },
          { y1: clamp(config.medium), y2: clamp(config.high), fill: FILL.medium },
          { y1: clamp(config.high), y2: clamp(config.elite), fill: FILL.high },
          { y1: clamp(config.elite), y2: top, fill: FILL.elite },
        ];
  return (
    <>
      {ranges.map((r, i) => (
        <ReferenceArea key={i} y1={r.y1} y2={r.y2} fill={r.fill} strokeOpacity={0} ifOverflow="extendDomain" />
      ))}
    </>
  );
}
