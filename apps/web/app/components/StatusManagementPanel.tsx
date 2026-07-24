"use client";

import { useState, useTransition } from "react";
import type { BoardStatus } from "@deckgauge/shared";
import { STATUS_COLORS } from "@deckgauge/shared";
import {
  createBoardStatus,
  updateBoardStatus,
  deleteBoardStatus,
} from "../actions/board-statuses";

interface StatusManagementPanelProps {
  boardId: string;
  statuses: BoardStatus[];
  onClose: () => void;
}

export function StatusManagementPanel({
  boardId,
  statuses,
  onClose,
}: StatusManagementPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const usedColors = statuses.map((s) => s.color);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      await createBoardStatus(boardId, { label });
      setNewLabel("");
    });
  };

  const handleRename = (id: string) => {
    const label = editLabel.trim();
    if (!label) return;
    startTransition(async () => {
      await updateBoardStatus(id, { label }, boardId);
      setEditingId(null);
      setEditLabel("");
    });
  };

  const handleColorChange = (id: string, color: string) => {
    startTransition(async () => {
      await updateBoardStatus(id, { color }, boardId);
      setColorPickerId(null);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteBoardStatus(id, boardId);
      setDeleteConfirmId(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
      <div className="glass w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Manage Statuses</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
          >
            {"\u00D7"}
          </button>
        </div>

        {/* Status list */}
        <div className="space-y-1 mb-4 max-h-72 overflow-y-auto">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
              {/* Color dot */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColorPickerId(colorPickerId === s.id ? null : s.id)}
                  className="w-4 h-4 rounded-full shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500/30 transition-all"
                  style={{ backgroundColor: s.color }}
                  disabled={isPending}
                />
                {colorPickerId === s.id && (
                  <div className="absolute z-50 top-6 left-0 glass-elevated p-2.5 grid grid-cols-5 gap-1.5 w-44 animate-fade-in">
                    {STATUS_COLORS.map((c) => {
                      const taken = usedColors.includes(c) && c !== s.color;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => !taken && handleColorChange(s.id, c)}
                          disabled={taken || isPending}
                          className={`w-6 h-6 rounded-full transition-all ${
                            c === s.color ? "ring-2 ring-offset-1 ring-indigo-500" : ""
                          } ${taken ? "opacity-25 cursor-not-allowed" : "hover:ring-2 hover:ring-offset-1 hover:ring-white/20"}`}
                          style={{ backgroundColor: c }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Label (editable) */}
              {editingId === s.id ? (
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => handleRename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(s.id);
                    if (e.key === "Escape") { setEditingId(null); setEditLabel(""); }
                  }}
                  className="flex-1 text-xs bg-white border border-indigo-500 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  autoFocus
                  disabled={isPending}
                />
              ) : (
                <span
                  className="flex-1 text-xs text-slate-700 cursor-pointer hover:text-indigo-500 transition-colors"
                  onClick={() => { setEditingId(s.id); setEditLabel(s.label); }}
                >
                  {s.label}
                </span>
              )}

              {/* Icon preview */}
              {s.icon && <span className="text-xs text-slate-400">{s.icon}</span>}

              {/* Default badge */}
              {s.isDefault && (
                <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">default</span>
              )}

              {/* Delete */}
              {deleteConfirmId === s.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                    disabled={isPending}
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(s.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-300 hover:text-red-400 transition-all"
                  disabled={isPending}
                >
                  {"\u2715"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new status */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="New status name..."
            className="flex-1 input-dark text-xs"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim() || isPending}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
