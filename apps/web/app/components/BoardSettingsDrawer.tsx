'use client';

import { useEffect, useRef, useState } from 'react';
import type { BoardOwner } from '@deckgauge/shared';
import { fetchBoardOwners } from '../actions/owners';
import { OwnersManager } from './OwnersManager';

interface Props {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

export function BoardSettingsDrawer({ boardId, open, onClose }: Props) {
  const [owners, setOwners] = useState<BoardOwner[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const refetch = () => {
    fetchBoardOwners(boardId)
      .then(setOwners)
      .catch(() => setOwners([]));
  };

  useEffect(() => {
    if (!open) return;
    refetch();
  }, [open, boardId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Board settings"
      className="absolute right-4 top-12 z-40 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
    >
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Board settings</h2>
      <OwnersManager boardId={boardId} owners={owners} onChange={refetch} />
      <div className="mt-4 pt-3 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access</h3>
        <p className="mt-1 text-xs text-slate-400">Coming soon - IAM roles per board.</p>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Board info</h3>
        <p className="mt-1 text-xs text-slate-400">Coming soon - rename, archive, delete.</p>
      </div>
    </div>
  );
}
