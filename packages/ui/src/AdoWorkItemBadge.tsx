interface AdoWorkItemBadgeProps {
  workItemId: number;
  project: string;
  orgUrl: string;
}

export function AdoWorkItemBadge({ workItemId, project, orgUrl }: AdoWorkItemBadgeProps) {
  const base = orgUrl.replace(/\/+$/, '');
  const href = `${base}/${encodeURIComponent(project)}/_workitems/edit/${workItemId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 transition-colors shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      #{workItemId}
    </a>
  );
}
