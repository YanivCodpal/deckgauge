'use client';

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

export function TypeChipPicker({ options, value, onChange }: Props) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-label={opt}
            aria-pressed={on}
            onClick={() => toggle(opt)}
            className={`px-2 py-0.5 rounded-md text-xs border transition-colors ${
              on
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-50 text-slate-500 border-dashed border-slate-300 hover:border-indigo-200'
            }`}
          >
            {on && (
              <span aria-hidden="true" className="mr-1">
                ✓
              </span>
            )}
            {opt}
          </button>
        );
      })}
    </div>
  );
}
