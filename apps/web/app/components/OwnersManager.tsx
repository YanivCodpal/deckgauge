"use client";

import { useState, useTransition } from "react";
import type { BoardOwner } from "@deckgauge/shared";
import { OWNER_COLORS } from "@deckgauge/shared";
import { OwnerAvatar } from "@deckgauge/ui";
import {
  createBoardOwner,
  updateBoardOwner,
  deleteBoardOwner,
} from "../actions/owners";

interface OwnersManagerProps {
  boardId: string;
  owners: BoardOwner[];
  onChange?: () => void;
}

export function OwnersManager({ boardId, owners, onChange }: OwnersManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const usedColors = owners.map((o) => o.color);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      await createBoardOwner(boardId, { name });
      setNewName("");
      onChange?.();
    });
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    startTransition(async () => {
      await updateBoardOwner(id, { name }, boardId);
      setEditingId(null);
      setEditName("");
      onChange?.();
    });
  };

  const handleColorChange = (id: string, color: string) => {
    startTransition(async () => {
      await updateBoardOwner(id, { color }, boardId);
      setColorPickerId(null);
      onChange?.();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteBoardOwner(id, boardId);
      setDeleteConfirmId(null);
      onChange?.();
    });
  };

  return (
    <div>
      <h2 className="text-base font-medium text-gray-900 mb-3">Owners</h2>
      <p className="text-sm text-gray-600 mb-4">
        Manage board owners. Owners can be assigned to tasks.
      </p>

      {/* Owner list */}
      <div className="space-y-1 mb-4">
        {owners.length === 0 && (
          <p className="text-sm text-slate-400 py-2">No owners yet. Add one below.</p>
        )}
        {owners.map((o) => (
          <div key={o.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 group">
            {/* Avatar */}
            <OwnerAvatar name={o.name} color={o.color} size={28} />

            {/* Color dot (clickable) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPickerId(colorPickerId === o.id ? null : o.id)}
                className="w-3.5 h-3.5 rounded-full shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500/30 transition-all"
                style={{ backgroundColor: o.color }}
                disabled={isPending}
              />
              {colorPickerId === o.id && (
                <div className="absolute z-50 top-5 left-0 glass-elevated p-2.5 grid grid-cols-5 gap-1.5 w-44 animate-fade-in">
                  {OWNER_COLORS.map((c) => {
                    const taken = usedColors.includes(c) && c !== o.color;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => !taken && handleColorChange(o.id, c)}
                        disabled={taken || isPending}
                        className={`w-6 h-6 rounded-full transition-all ${
                          c === o.color ? "ring-2 ring-offset-1 ring-indigo-500" : ""
                        } ${taken ? "opacity-25 cursor-not-allowed" : "hover:ring-2 hover:ring-offset-1 hover:ring-white/20"}`}
                        style={{ backgroundColor: c }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Name (editable) */}
            {editingId === o.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRename(o.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(o.id);
                  if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                }}
                className="flex-1 text-sm bg-white border border-indigo-500 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                autoFocus
                disabled={isPending}
              />
            ) : (
              <span
                className="flex-1 text-sm text-slate-700 cursor-pointer hover:text-indigo-500 transition-colors"
                onClick={() => { setEditingId(o.id); setEditName(o.name); }}
              >
                {o.name}
              </span>
            )}

            {/* Delete */}
            {deleteConfirmId === o.id ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(o.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                  disabled={isPending}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirmId(o.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-300 hover:text-red-400 transition-all"
                disabled={isPending}
              >
                {"\u2715"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new owner */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="New owner name..."
          className="flex-1 input-dark text-sm"
          disabled={isPending}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || isPending}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          Add Owner
        </button>
      </div>
    </div>
  );
}
