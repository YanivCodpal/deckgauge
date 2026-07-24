interface CommentBadgeProps {
  count: number;
  onClick?: () => void;
}

export function CommentBadge({ count, onClick }: CommentBadgeProps) {
  const isEmpty = count === 0;
  const label = count === 1 ? "1 update" : `${count} updates`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs cursor-pointer hover:text-indigo-400 transition-colors ${isEmpty ? "text-slate-300" : "text-slate-400"}`}
      title={isEmpty ? undefined : label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      role="button"
      tabIndex={0}
      aria-label={isEmpty ? "Add comment" : label}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={isEmpty ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {count > 0 && <span className="font-semibold">{count}</span>}
    </span>
  );
}
