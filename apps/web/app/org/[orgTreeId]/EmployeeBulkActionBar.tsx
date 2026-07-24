'use client';

import { useState } from 'react';

interface EmployeeBulkActionBarProps {
  count: number;
  groups: { id: string; name: string }[];
  onMoveToGroup: (groupId: string) => void;
  onRemove: () => void;
  onClear: () => void;
}

export function EmployeeBulkActionBar({
  count,
  groups,
  onMoveToGroup,
  onRemove,
  onClear,
}: EmployeeBulkActionBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-elevated shadow-lg px-6 py-3 flex items-center gap-4 animate-slide-up">
      <span className="text-sm font-medium text-indigo-500">{count} selected</span>
      <div className="h-4 w-px bg-slate-200" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className="text-sm text-slate-600 hover:text-indigo-500 transition-colors"
        >
          Move to group
        </button>
        {showMoveMenu && (
          <div className="dropdown-menu bottom-full mb-2 left-0 w-40">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  onMoveToGroup(g.id);
                  setShowMoveMenu(false);
                }}
                className="dropdown-item"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-red-600 hover:text-red-500 transition-colors"
      >
        Remove from board
      </button>

      <div className="h-4 w-px bg-slate-200" />

      <button
        type="button"
        onClick={onClear}
        className="text-sm text-slate-500 hover:text-slate-600 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
