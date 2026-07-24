"use client";

import type { BoardColumn } from "@deckgauge/shared";

interface ColumnSummaryRowProps {
  columns?: BoardColumn[];
  items: { fieldValues?: Record<string, string>; status?: string }[];
  groupColor?: string;
  hasAssignee?: boolean;
  hasSourceLink?: boolean;
  hasUpdated?: boolean;
  hasClassificationColumn?: boolean;
}

function summarize(column: BoardColumn, items: ColumnSummaryRowProps["items"]): string {
  const values = items
    .map((item) => item.fieldValues?.[column.id])
    .filter((v): v is string => v !== undefined && v !== "");

  switch (column.type) {
    case "NUMBER": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      return nums.length > 0 ? String(nums.reduce((a, b) => a + b, 0)) : "\u2014";
    }
    case "CHECKBOX": {
      const checked = values.filter((v) => v === "true").length;
      return `${checked} / ${items.length}`;
    }
    case "DATE": {
      if (values.length === 0) return "\u2014";
      const sorted = [...values].sort();
      if (sorted.length === 1) return sorted[0]!;
      return `${sorted[0]} \u2192 ${sorted[sorted.length - 1]}`;
    }
    default:
      return values.length > 0 ? `${values.length} items` : "\u2014";
  }
}

export function ColumnSummaryRow({
  columns,
  items,
  groupColor = '#6C6CFF',
  hasAssignee = false,
  hasSourceLink = false,
  hasUpdated = true,
  hasClassificationColumn = false,
}: ColumnSummaryRowProps) {
  if (!columns || columns.length === 0) return null;

  return (
    <div
      className="grid items-center bg-slate-50 border-t border-slate-200"
      style={{ gridTemplateColumns: 'var(--board-grid-cols)' }}
    >
      {/* Left color stripe (pinned) */}
      <div
        className="sticky left-0 z-10 h-full"
        style={{ backgroundColor: groupColor, opacity: 0.6 }}
      />

      {/* Checkbox spacer (pinned) */}
      <div className="sticky z-10 bg-slate-50 px-1 py-1.5" style={{ left: 6 }} />

      {/* Name spacer (pinned) */}
      <div className="sticky z-10 bg-slate-50 px-3 py-1.5 border-r border-slate-200" style={{ left: 34 }} />

      {/* Owner spacer */}
      <div className="px-3 py-1.5 border-r border-slate-200" />

      {/* Assignee spacer */}
      {hasAssignee && <div className="px-3 py-1.5 border-r border-slate-200" />}

      {/* Status spacer */}
      <div className="px-3 py-1.5 border-r border-slate-200" />

      {/* Custom column summaries */}
      {columns.map((col) => (
        <div
          key={col.id}
          className={`px-3 py-1.5 border-r border-slate-200 text-xs font-medium text-slate-400 ${col.type === "NUMBER" ? "text-right" : "text-center"}`}
        >
          {summarize(col, items)}
        </div>
      ))}

      {/* Source link spacer */}
      {hasSourceLink && <div className="px-3 py-1.5 border-r border-slate-200" />}

      {/* Updated spacer */}
      {hasUpdated && <div className="px-3 py-1.5 border-r border-slate-200" />}

      {/* CapEx/OpEx classification spacer */}
      {hasClassificationColumn && <div className="px-3 py-1.5 border-r border-slate-200" />}

      {/* Action spacer */}
      <div className="px-1 py-1.5" />
    </div>
  );
}
