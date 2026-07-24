interface DynamicStatusPillProps {
  label: string;
  color: string;
  icon?: string | null;
}

export function DynamicStatusPill({ label, color, icon }: DynamicStatusPillProps) {
  return (
    <span
      className="flex items-center justify-center gap-1 w-full rounded-sm px-2 py-1.5 text-xs font-semibold text-white whitespace-nowrap"
      style={{ backgroundColor: color }}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
