'use client';

import { classificationMeta } from '../lib/classification';

interface ClassificationPillProps {
  classification: string;
  className?: string;
}

/** Small CapEx / OpEx badge; renders nothing for unclassified work. */
export function ClassificationPill({ classification, className }: ClassificationPillProps) {
  const meta = classificationMeta(classification);
  if (!meta) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.pill} ${className ?? ''}`}
    >
      {meta.label}
    </span>
  );
}
