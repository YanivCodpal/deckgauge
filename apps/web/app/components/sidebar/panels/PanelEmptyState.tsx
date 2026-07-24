'use client';

interface PanelEmptyStateProps {
  message: string;
}

/** Quiet placeholder shown when a type panel has nothing to list yet. */
export function PanelEmptyState({ message }: PanelEmptyStateProps) {
  return (
    <p className="px-3 py-6 text-center text-xs leading-relaxed text-slate-400">{message}</p>
  );
}
