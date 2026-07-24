"use client";

import { useState } from "react";
import type { ProjectStatus } from "@deckgauge/shared";

const STATUS_OPTIONS: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "AT_RISK",
  "BLOCKED",
  "DONE",
];

interface BulkActionBarProps {
  count: number;
  groups: { id: string; name: string }[];
  onAction: (action: string, value?: string) => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  groups,
  onAction,
  onClear,
}: BulkActionBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-elevated shadow-lg px-6 py-3 flex items-center gap-4 animate-slide-up">
      <span className="text-sm font-medium text-indigo-500">{count} selected</span>

      <div className="h-4 w-px bg-slate-200" />

      {/* Change status */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="text-sm text-slate-600 hover:text-indigo-500 transition-colors"
        >
          Change status
        </button>
        {showStatusMenu && (
          <div className="dropdown-menu bottom-full mb-2 left-0 w-40">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onAction("status", s);
                  setShowStatusMenu(false);
                }}
                className="dropdown-item"
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Move to group */}
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
                  onAction("move", g.id);
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
        onClick={() => onAction("duplicate")}
        className="text-sm text-slate-600 hover:text-indigo-500 transition-colors"
      >
        Duplicate
      </button>

      <button
        type="button"
        onClick={() => onAction("delete")}
        className="text-sm text-red-600 hover:text-red-500 transition-colors"
      >
        Delete
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
