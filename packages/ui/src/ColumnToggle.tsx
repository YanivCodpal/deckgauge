"use client";

import { useState } from "react";

export type VisibleColumns = {
  name: boolean;
  owner: boolean;
  assignee?: boolean;
  status: boolean;
  description: boolean;
  updated: boolean;
  size?: boolean;
  startDate?: boolean;
  endDate?: boolean;
  dueDate?: boolean;
  duration?: boolean;
  source?: boolean;
  classification?: boolean;
};

interface ColumnToggleProps {
  visibleColumns: VisibleColumns;
  onToggle: (column: keyof VisibleColumns) => void;
}

const BASE_COLUMNS: Array<{ key: keyof VisibleColumns; label: string }> = [
  { key: "name", label: "Name" },
  { key: "owner", label: "Owner" },
  { key: "assignee", label: "Assignee" },
  { key: "status", label: "Status" },
  { key: "description", label: "Description" },
  { key: "updated", label: "Updated" },
];

const SYSTEM_FIELD_COLUMNS: Array<{ key: keyof VisibleColumns; label: string }> = [
  { key: "size", label: "Size" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "dueDate", label: "Due date" },
  { key: "duration", label: "Duration" },
];

export function ColumnToggle({ visibleColumns, onToggle }: ColumnToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const systemColumns = SYSTEM_FIELD_COLUMNS.filter(({ key }) =>
    Object.prototype.hasOwnProperty.call(visibleColumns, key),
  );

  const columns = [...BASE_COLUMNS, ...systemColumns];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-label="Toggle columns"
      >
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 rounded border border-gray-200 bg-white shadow-lg z-10">
          {columns.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!visibleColumns[key]}
                onChange={() => onToggle(key)}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
