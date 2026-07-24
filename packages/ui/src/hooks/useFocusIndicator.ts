interface RowIndicatorProps {
  isFocused: boolean;
  isSelected: boolean;
}

export function getRowClasses({ isFocused, isSelected }: RowIndicatorProps): string {
  if (!isFocused && !isSelected) return '';

  const border = 'border-l-4 border-indigo-500';

  if (isSelected) {
    return `${border} bg-indigo-50/50`;
  }

  return `${border} bg-slate-50 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]`;
}

export function getCellClasses(isFocused: boolean): string {
  if (!isFocused) return '';
  return 'outline outline-2 outline-indigo-500 outline-offset-2 rounded bg-indigo-50/5';
}
