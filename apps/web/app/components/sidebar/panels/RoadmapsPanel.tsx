'use client';

import type { RoadmapNodeData } from '@deckgauge/shared';
import { RoadmapNode } from '../RoadmapNode';
import { PanelEmptyState } from './PanelEmptyState';

interface RoadmapsPanelProps {
  roadmaps: RoadmapNodeData[];
  hidden: RoadmapNodeData[];
  activeRoadmapId: string | null;
  onToggleFavorite: (node: RoadmapNodeData) => void;
  onHide: (node: RoadmapNodeData) => void;
  onUnhide: (node: RoadmapNodeData) => void;
  onDelete: (node: RoadmapNodeData) => void;
}

export function RoadmapsPanel({
  roadmaps,
  hidden,
  activeRoadmapId,
  onToggleFavorite,
  onHide,
  onUnhide,
  onDelete,
}: RoadmapsPanelProps) {
  if (roadmaps.length === 0 && hidden.length === 0) {
    return <PanelEmptyState message="No roadmaps yet. Create one with the New button below." />;
  }

  return (
    <>
      {roadmaps.map((r) => (
        <RoadmapNode
          key={r.id}
          node={r}
          depth={0}
          active={r.id === activeRoadmapId}
          onToggleFavorite={onToggleFavorite}
          onHide={onHide}
          onUnhide={onUnhide}
          onDelete={onDelete}
        />
      ))}

      {hidden.length > 0 && (
        <>
          <p className="mt-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Hidden ({hidden.length})
          </p>
          {hidden.map((r) => (
            <RoadmapNode
              key={r.id}
              node={r}
              depth={0}
              hidden
              active={r.id === activeRoadmapId}
              onToggleFavorite={onToggleFavorite}
              onHide={onHide}
              onUnhide={onUnhide}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </>
  );
}
