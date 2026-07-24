'use client';

import React from 'react';

interface GitHubIssueRowProps {
  number: number;
  title: string;
  assigneeLogin: string | null;
  state: 'open' | 'closed';
  labels: string[];
  repoFullName: string;
}

export function GitHubIssueRow({
  number,
  title,
  assigneeLogin,
  state,
  labels,
  repoFullName,
}: GitHubIssueRowProps) {
  const issueUrl = `https://github.com/${repoFullName}/issues/${number}`;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-xs opacity-80">
      <a
        href={issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline font-mono min-w-[48px]"
      >
        #{number}
      </a>
      <span className="flex-1 truncate text-slate-700">{title}</span>
      <span className="text-slate-500 w-24 truncate">{assigneeLogin ?? '—'}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          state === 'open'
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {state}
      </span>
      {labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {labels.map((label) => (
            <span
              key={label}
              className="px-1.5 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
