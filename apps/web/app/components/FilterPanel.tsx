"use client";

import { useState } from "react";
import type { BoardColumn } from "@deckgauge/shared";

interface FilterRule {
  column: string;
  condition: string;
  value: string;
}

interface FilterPanelProps {
  columns: BoardColumn[];
  onChange: (rules: FilterRule[]) => void;
  onClose: () => void;
}

const CONDITIONS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "is_empty", label: "is empty" },
];

export function FilterPanel({ columns, onChange, onClose }: FilterPanelProps) {
  const [rules, setRules] = useState<FilterRule[]>([]);

  const columnOptions = [
    { value: "status", label: "Status" },
    { value: "owner", label: "Owner" },
    ...columns.map((c) => ({ value: c.id, label: c.name })),
  ];

  const addRule = () => {
    const newRules = [...rules, { column: "status", condition: "is", value: "" }];
    setRules(newRules);
    onChange(newRules.filter((r) => r.condition === "is_empty" || r.value));
  };

  const updateRule = (index: number, field: keyof FilterRule, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
    onChange(newRules.filter((r) => r.condition === "is_empty" || r.value));
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onChange(newRules.filter((r) => r.condition === "is_empty" || r.value));
  };

  const clearAll = () => {
    setRules([]);
    onChange([]);
  };

  return (
    <div className="glass-elevated p-4 mt-2 max-w-xl animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">Filters</h3>
        <div className="flex gap-2">
          {rules.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-slate-500 hover:text-slate-600 transition-colors"
            >
              Clear all
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

      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={rule.column}
              onChange={(e) => updateRule(i, "column", e.target.value)}
              className="select-dark text-xs py-1.5"
            >
              {columnOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={rule.condition}
              onChange={(e) => updateRule(i, "condition", e.target.value)}
              className="select-dark text-xs py-1.5"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {rule.condition !== "is_empty" && (
              <input
                type="text"
                value={rule.value}
                onChange={(e) => updateRule(i, "value", e.target.value)}
                placeholder="Value"
                className="input-dark text-xs py-1.5 flex-1 min-w-[120px]"
              />
            )}
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="text-xs text-red-600 hover:text-red-500 transition-colors"
            >
              {"\u2715"}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="mt-3 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
      >
        + Add filter rule
      </button>
    </div>
  );
}
