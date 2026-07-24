'use client';

import { useEffect, useState, useMemo } from 'react';
import type { BoardColumn } from '@deckgauge/shared';
import { loadRoadmapView, loadBoardColumns } from '../../actions/roadmap';
import type { RoadmapViewPayload } from '../../actions/roadmap';
import { fetchBoardOwners } from '../../actions/owners';
import { RoadmapCanvas } from './RoadmapCanvas';
import { createBoardAdapter } from './roadmap-adapter';

interface RoadmapTabProps {
  boardId: string;
  viewId: string;
  canEdit: boolean;
}

export default function RoadmapTab({ boardId, viewId, canEdit }: RoadmapTabProps) {
  const [initial, setInitial] = useState<RoadmapViewPayload | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId || !viewId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      loadRoadmapView(boardId, viewId),
      loadBoardColumns(boardId),
      fetchBoardOwners(boardId).catch(() => []),
    ])
      .then(([roadmapPayload, boardColumns, boardOwners]) => {
        if (cancelled) return;
        setInitial(roadmapPayload);
        setColumns(boardColumns);
        setOwners(boardOwners.map((o) => o.name));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load roadmap');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, viewId]);

  // Built unconditionally (before the early returns below) so the hook order is
  // stable across the loading → loaded transition — a hook after an early return
  // changes the per-render hook count and crashes with React error #310.
  const adapter = useMemo(
    () => createBoardAdapter({ boardId, viewId, columns }),
    [boardId, viewId, columns],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Loading roadmap…
      </div>
    );
  }

  if (error || !initial) {
    return (
      <div className="flex items-center justify-center h-32 text-red-400 text-sm">
        {error ?? 'Could not load roadmap data.'}
      </div>
    );
  }

  return (
    <RoadmapCanvas
      boardId={boardId}
      initial={initial}
      columns={columns}
      owners={owners}
      canEdit={canEdit}
      adapter={adapter}
    />
  );
}
