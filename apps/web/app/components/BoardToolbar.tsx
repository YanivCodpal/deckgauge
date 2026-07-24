"use client";

import { useState, type RefObject } from "react";
import { ColumnManager } from "./ColumnManager";
import { SearchBar, type SearchBarHandle } from "./SearchBar";
import { FilterPanel } from "./FilterPanel";
import { SortPanel } from "./SortPanel";
import { AutomationPanel } from "./AutomationPanel";
import type { BoardColumn } from "@deckgauge/shared";
import type { SortConfig } from "../utils/sort-projects";

interface BoardToolbarProps {
  boardId: string;
  columns?: BoardColumn[];
  onSearch?: (query: string) => void;
  onFilterChange?: (rules: { column: string; condition: string; value: string }[]) => void;
  sortConfig?: SortConfig | null;
  onSortChange?: (config: SortConfig | null) => void;
  searchRef?: RefObject<SearchBarHandle | null>;
}

export function BoardToolbar({
  boardId,
  columns,
  onSearch,
  onFilterChange,
  sortConfig,
  onSortChange,
  searchRef,
}: BoardToolbarProps) {
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  return (
    <>
      <div className="flex items-center gap-2">
        {onSearch && <SearchBar ref={searchRef} onSearch={onSearch} />}

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-xs py-1.5 px-3 ${
            filterCount > 0 ? "border-indigo-500 text-indigo-500" : ""
          }`}
        >
          Filter {filterCount > 0 && `(${filterCount})`}
        </button>

        <button
          type="button"
          onClick={() => setShowSort(!showSort)}
          className={`btn-secondary text-xs py-1.5 px-3 ${
            sortConfig ? "border-indigo-500 text-indigo-500" : ""
          }`}
        >
          Sort {sortConfig ? "(1)" : ""}
        </button>

        <button
          type="button"
          onClick={() => setShowColumnManager(true)}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          + Add Column
        </button>

        <button
          type="button"
          onClick={() => setShowAutomations(true)}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          Automations
        </button>
      </div>

      {showFilters && (
        <FilterPanel
          columns={columns || []}
          onChange={(rules) => {
            setFilterCount(rules.length);
            onFilterChange?.(rules);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {showSort && (
        <SortPanel
          columns={columns || []}
          sortConfig={sortConfig ?? null}
          onChange={(config) => {
            onSortChange?.(config);
            if (!config) setShowSort(false);
          }}
          onClose={() => setShowSort(false)}
        />
      )}

      {showColumnManager && (
        <ColumnManager
          boardId={boardId}
          onClose={() => setShowColumnManager(false)}
          onSuccess={() => setShowColumnManager(false)}
        />
      )}

      {showAutomations && (
        <AutomationPanel
          boardId={boardId}
          onClose={() => setShowAutomations(false)}
        />
      )}
    </>
  );
}
