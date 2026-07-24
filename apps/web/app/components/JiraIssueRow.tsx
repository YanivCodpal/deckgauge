'use client';

import React from 'react';

interface JiraIssueRowProps {
  issueKey: string;
  summary: string;
  assignee: string | null;
  status: string;
  type: string;
  atlassianUrl: string;
}

export function JiraIssueRow({
  issueKey,
  summary,
  assignee,
  status,
  type,
  atlassianUrl,
}: JiraIssueRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-xs opacity-70">
      <a
        href={`${atlassianUrl}/browse/${issueKey}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline font-mono min-w-[80px]"
      >
        {issueKey}
      </a>
      <a
        href={`${atlassianUrl}/browse/${issueKey}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 truncate text-slate-600 hover:text-blue-600 hover:underline transition-colors"
      >
        {summary}
      </a>
      <span className="text-slate-500 w-24 truncate">{assignee ?? '—'}</span>
      <span className="text-slate-500 w-16 truncate text-xs">{type}</span>
      <span className="text-slate-500 text-xs">{status}</span>
    </div>
  );
}
