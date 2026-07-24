"use client";

import { useState } from "react";
import type { BoardColumn } from "@deckgauge/shared";
import type { SortConfig } from "../utils/sort-projects";

interface SortPanelProps {
  columns: BoardColumn[];
  sortConfig: SortConfig | null;
  onChange: (config: SortConfig | null) => void;
  onClose: () => void;
}

const BUILT_IN_COLUMNS = [
  { value: "name", label: "Task" },
  { value: "owner", label: "Owner" },
  { value: "status", label: "Status" },
  { value: "updated", label: "Updated" },
];

export function SortPanel({ columns, sortConfig, onChange, onClose }: SortPanelProps) {
  const [column, setColumn] = useState(sortConfig?.column ?? "name");
  const [direction, setDirection] = useState<"asc" | "desc">(sortConfig?.direction ?? "asc");

  const columnOptions = [
    ...BUILT_IN_COLUMNS,
    ...columns.map((c) => ({ value: c.id, label: c.name })),
  ];

  const applySort = (col: string, dir: "asc" | "desc") => {
    setColumn(col);
    setDirection(dir);
    onChange({ column: col, direction: dir });
  };

  const clearSort = () => {
    onChange(null);
  };

  return (
    <div className="glass-elevated p-4 mt-2 max-w-sm animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">Sort</h3>
        <div className="flex gap-2">
          {sortConfig && (
            <button
              type="button"
              onClick={clearSort}
              className="text-xs text-slate-500 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-600 transition-colors"
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={column}
          onChange={(e) => applySort(e.target.value, direction)}
          className="select-dark text-xs py-1.5 flex-1"
        >
          {columnOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => applySort(column, e.target.value as "asc" | "desc")}
          className="select-dark text-xs py-1.5"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>
  );
}
