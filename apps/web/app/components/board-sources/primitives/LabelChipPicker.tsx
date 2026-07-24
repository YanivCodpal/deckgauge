'use client';
import { useState } from 'react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function LabelChipPicker({ value, onChange, suggestions = [], placeholder }: Props) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput('');
      return;
    }
    onChange([...value, v]);
    setInput('');
  };
  const remove = (label: string) => onChange(value.filter((l) => l !== label));
  const filtered = suggestions.filter((s) => !value.includes(s) && s.includes(input));

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {value.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700"
        >
          {label}
          <button
            type="button"
            aria-label={`remove ${label}`}
            className="text-indigo-400 hover:text-indigo-700"
            onClick={() => remove(label)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(input);
          }
        }}
        placeholder={placeholder ?? '+ label'}
        className="text-xs px-2 py-0.5 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 focus:outline-none focus:border-indigo-300"
      />
      {input && filtered.length > 0 && (
        <div className="relative">
          <ul className="absolute z-20 mt-1 bg-white border border-slate-200 rounded-md shadow-sm text-xs min-w-[140px]">
            {filtered.slice(0, 8).map((s) => (
              <li
                key={s}
                className="px-2 py-1 hover:bg-slate-50 cursor-pointer"
                onMouseDown={() => add(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
