'use client';

import { useState, useCallback } from 'react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export interface DroppedSummary {
  ownerCleared: boolean;
  statusReset: boolean;
  columnsDropped: string[];
}

interface UseCrossBoardMoveProps {
  onMoved: (dropped: DroppedSummary) => void;
}

interface MoveParams {
  projectId: string;
  targetGroupId: string;
}

export function useCrossBoardMove({ onMoved }: UseCrossBoardMoveProps) {
  const authFetch = useAuthFetch();
  const [pending, setPending] = useState(false);

  const move = useCallback(
    async ({ projectId, targetGroupId }: MoveParams): Promise<DroppedSummary> => {
      setPending(true);
      try {
        const res = await authFetch(`/projects/${projectId}/move-to-board`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targetGroupId }),
        });
        if (!res.ok) throw new Error(`Move failed (${res.status})`);
        const data = (await res.json()) as { dropped: DroppedSummary };
        onMoved(data.dropped);
        return data.dropped;
      } finally {
        setPending(false);
      }
    },
    [authFetch, onMoved],
  );

  return { move, pending };
}
