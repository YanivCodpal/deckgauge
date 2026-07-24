interface GitHubIssueBadgeProps {
  githubIssueId: string;
  githubRepoFullName: string;
}

export function GitHubIssueBadge({ githubIssueId, githubRepoFullName }: GitHubIssueBadgeProps) {
  // githubIssueId format: "owner/repo#number"
  const number = githubIssueId.split('#').pop();
  const href = `https://github.com/${githubRepoFullName}/issues/${number}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      #{number}
    </a>
  );
}
