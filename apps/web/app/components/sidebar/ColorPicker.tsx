'use client';

import { DEFAULT_FOLDER_COLOR } from '@deckgauge/shared';

const SWATCHES = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#06B6D4',
  '#EF4444', '#8B5CF6', '#84CC16', '#64748B', '#0EA5E9',
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div
      role="listbox"
      aria-label="Folder color"
      className="grid grid-cols-5 gap-2 rounded-xl bg-white p-2.5 shadow-lg"
    >
      {SWATCHES.map((hex) => {
        const selected = hex.toLowerCase() === (value || DEFAULT_FOLDER_COLOR).toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={hex}
            onClick={() => onChange(hex)}
            className={`h-5 w-5 rounded-md transition-transform hover:scale-110 ${
              selected ? 'outline outline-2 outline-offset-2 outline-slate-900' : ''
            }`}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
