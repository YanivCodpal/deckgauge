'use client';

import { useEffect, useState } from 'react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface PickerGroup {
  id: string;
  name: string;
}

interface PickerBoard {
  id: string;
  name: string;
  groups: PickerGroup[];
}

interface Props {
  roadmapId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function RoadmapGroupPicker({ roadmapId, onClose, onAdded }: Props) {
  const authFetch = useAuthFetch();

  const [boards, setBoards] = useState<PickerBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [wholeBoardIds, setWholeBoardIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/roadmaps/picker/boards')
      .then((r) => r.json())
      .then((data: PickerBoard[]) => {
        setBoards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authFetch]);

  const toggleBoard = (boardId: string) => {
    setExpandedBoardId((prev) => (prev === boardId ? null : boardId));
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleWholeBoard = (boardId: string) => {
    setWholeBoardIds((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const postOpts = (body: unknown): RequestInit => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const promises: Promise<Response>[] = [];

      for (const board of boards) {
        if (wholeBoardIds.has(board.id)) {
          promises.push(
            authFetch(`/roadmaps/${roadmapId}/subscriptions`, postOpts({ boardId: board.id })),
          );
        } else {
          const groupIds = board.groups
            .map((g) => g.id)
            .filter((id) => selectedGroupIds.has(id));
          if (groupIds.length > 0) {
            promises.push(
              authFetch(`/roadmaps/${roadmapId}/groups`, postOpts({ groupIds })),
            );
          }
        }
      }

      if (promises.length === 0) return;
      setError(null);
      const responses = await Promise.all(promises);
      if (responses.some((r) => !r.ok)) {
        throw new Error('Request failed');
      }
      onAdded();
    } catch {
      setError('Failed to add groups. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelection =
    wholeBoardIds.size > 0 ||
    boards.some((b) => b.groups.some((g) => selectedGroupIds.has(g.id)));

  return (
    <div role="dialog" aria-label="Add groups to roadmap">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Add groups to roadmap</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto px-5 py-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading boards…</p>
            ) : boards.length === 0 ? (
              <p className="text-sm text-slate-500">No accessible boards found.</p>
            ) : (
              <ul className="space-y-1">
                {boards.map((board) => (
                  <li key={board.id}>
                    {/* Board row */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                      onClick={() => toggleBoard(board.id)}
                      aria-expanded={expandedBoardId === board.id}
                    >
                      <span
                        className="text-slate-400 text-xs"
                        aria-hidden="true"
                      >
                        {expandedBoardId === board.id ? '▾' : '▸'}
                      </span>
                      {board.name}
                    </button>

                    {/* Expanded: groups + whole-board toggle */}
                    {expandedBoardId === board.id && (
                      <div className="ml-6 mt-1 space-y-1 pb-1">
                        {/* Select entire board */}
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            aria-label="Select entire board"
                            checked={wholeBoardIds.has(board.id)}
                            onChange={() => toggleWholeBoard(board.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Select entire board
                        </label>

                        {/* Individual groups */}
                        {!wholeBoardIds.has(board.id) &&
                          board.groups.map((group) => (
                            <label
                              key={group.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                aria-label={group.name}
                                checked={selectedGroupIds.has(group.id)}
                                onChange={() => toggleGroup(group.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {group.name}
                            </label>
                          ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {error && (
            <p role="alert" className="px-5 pt-2 text-sm text-rose-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasSelection || submitting}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
