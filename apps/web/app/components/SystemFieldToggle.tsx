"use client";

import { useState, useEffect, useRef } from "react";

export type SystemFieldKey = "size" | "startDate" | "endDate" | "duration";

interface SystemFieldToggleProps {
  visibility: {
    size: boolean;
    startDate: boolean;
    endDate: boolean;
    duration: boolean;
  };
  onToggle: (key: SystemFieldKey) => void;
  disabled?: boolean;
}

const SYSTEM_FIELDS: Array<{ key: SystemFieldKey; label: string }> = [
  { key: "size", label: "Size" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "duration", label: "Duration" },
];

export function SystemFieldToggle({ visibility, onToggle, disabled }: SystemFieldToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Toggle columns"
      >
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 rounded border border-gray-200 bg-white shadow-lg z-10">
          {SYSTEM_FIELDS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibility[key]}
                onChange={() => onToggle(key)}
                disabled={disabled}
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
