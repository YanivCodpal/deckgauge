'use client';

import { useState, useEffect, useCallback } from 'react';
import { triggerBoardSync, fetchBoardSyncStatus, type BoardSyncStatus } from '../actions/board-sync';

interface SyncControlsProps {
  boardId: string;
  userRole?: 'OWNER' | 'EDITOR' | 'VIEWER' | null;
}

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ITERATIONS = 30;

export function SyncControls({ boardId, userRole }: SyncControlsProps) {
  const [status, setStatus] = useState<BoardSyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'error' | 'info' | 'success'; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus(await fetchBoardSyncStatus(boardId));
  }, [boardId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const canTrigger = userRole === 'OWNER' || userRole === 'EDITOR';

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await triggerBoardSync(boardId);
      if (!result.ok) {
        const text =
          result.reason === 'queue_unavailable'
            ? 'Sync queue is offline — contact admin'
            : result.reason === 'forbidden'
              ? 'You need EDITOR access to sync this board'
              : 'Failed to trigger sync — try again';
        setToast({ kind: 'error', text });
        return;
      }

      const startedAt = status?.finishedAt ?? null;
      for (let i = 0; i < POLL_MAX_ITERATIONS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const next = await fetchBoardSyncStatus(boardId);
        if (next?.finishedAt && next.finishedAt !== startedAt) {
          setStatus(next);
          setToast({
            kind: 'success',
            text: `Synced — ${next.sourceCount} source${next.sourceCount === 1 ? '' : 's'} updated`,
          });
          return;
        }
      }
      setToast({ kind: 'info', text: 'Sync may still be running' });
    } finally {
      setIsSyncing(false);
      void loadStatus();
    }
  };

  const lastSyncedLabel = status?.finishedAt
    ? `Last synced ${formatRelativeTime(new Date(status.finishedAt))}`
    : 'Not synced yet';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500">{lastSyncedLabel}</span>
      {canTrigger && (
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          aria-label="Sync now"
        >
          <span className={isSyncing ? 'animate-spin' : ''}>↻</span>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 glass-elevated px-4 py-3 text-sm animate-slide-up ${
            toast.kind === 'error'
              ? 'text-red-600'
              : toast.kind === 'success'
                ? 'text-emerald-600'
                : 'text-slate-700'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
