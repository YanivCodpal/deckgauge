"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface SearchBarHandle {
  focus: () => void;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  inputAriaLabel?: string;
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  function SearchBar({ onSearch, inputAriaLabel }, ref) {
    const [value, setValue] = useState("");
    const timerRef = useRef<NodeJS.Timeout>();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearch(value);
      }, 200);
      return () => clearTimeout(timerRef.current);
    }, [value, onSearch]);

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search items..."
          aria-label={inputAriaLabel}
          className="rounded-lg bg-white border border-slate-200 pl-8 pr-8 py-1.5 text-xs text-slate-600 placeholder-slate-500 w-52 transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 hover:border-slate-300"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 text-xs transition-colors"
            aria-label="Clear search"
          >
            {"\u2715"}
          </button>
        )}
      </div>
    );
  },
);
