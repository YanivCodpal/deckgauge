interface JiraKeyBadgeProps {
  jiraKey: string;
  atlassianUrl: string;
}

export function JiraKeyBadge({ jiraKey, atlassianUrl }: JiraKeyBadgeProps) {
  const href = `${atlassianUrl.replace(/\/+$/, '')}/browse/${jiraKey}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {jiraKey}
    </a>
  );
}
