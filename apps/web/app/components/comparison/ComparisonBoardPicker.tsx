'use client';

import { useMemo } from 'react';
import type { BoardSummary, ComparisonMember } from '../../actions/comparison';

interface Props {
  allBoards: BoardSummary[];
  members: ComparisonMember[];
  canEdit: boolean;
  onAdd: (boardId: string) => void;
  onRemove: (boardId: string) => void;
  disabled?: boolean;
}

// Add/remove the boards in a comparison set. The selected boards render as
// removable chips; a dropdown offers the boards not yet in the set.
export function ComparisonBoardPicker({
  allBoards,
  members,
  canEdit,
  onAdd,
  onRemove,
  disabled,
}: Props) {
  const selectedIds = useMemo(() => new Set(members.map((m) => m.boardId)), [members]);
  const available = allBoards.filter((b) => !selectedIds.has(b.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {members.map((m) => (
        <span
          key={m.boardId}
          data-board-chip={m.boardId}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
        >
          {m.boardName}
          {canEdit && (
            <button
              type="button"
              aria-label={`Remove ${m.boardName}`}
              disabled={disabled}
              onClick={() => onRemove(m.boardId)}
              className="text-slate-400 hover:text-red-500 disabled:opacity-40"
            >
              ×
            </button>
          )}
        </span>
      ))}

      {members.length === 0 && (
        <span className="text-sm text-slate-400">No boards selected.</span>
      )}

      {canEdit && available.length > 0 && (
        <select
          aria-label="Add board to comparison"
          disabled={disabled}
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 disabled:opacity-50"
        >
          <option value="">+ Add board…</option>
          {available.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
