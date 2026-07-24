'use client';

interface SidebarSearchProps {
  value: string;
  onChange: (q: string) => void;
  /** Placeholder + accessible label, scoped to the active type (e.g. "Search roadmaps…"). */
  placeholder?: string;
}

export function SidebarSearch({ value, onChange, placeholder = 'Search boards…' }: SidebarSearchProps) {
  return (
    <div className="px-3 py-2.5">
      <input
        type="search"
        aria-label={placeholder.replace(/…$/, '')}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );
}
