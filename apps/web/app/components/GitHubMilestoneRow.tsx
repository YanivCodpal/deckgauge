'use client';

import React, { useState, useEffect } from 'react';
import { fetchGitHubIssues } from '../actions/github';
import { GitHubIssueRow } from './GitHubIssueRow';

interface GitHubMilestoneRowProps {
  id: string;
  title: string;
  dueOn: string | null;
  state: 'open' | 'closed';
  repoFullName: string;
  issueCount?: number;
}

interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  assigneeLogin: string | null;
  labels: string[];
  repoFullName: string;
}

function formatDueDate(dueOn: string | null): string {
  if (!dueOn) return 'No due date';
  const date = new Date(dueOn);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function GitHubMilestoneRow({
  id,
  title,
  dueOn,
  state,
  repoFullName,
  issueCount,
}: GitHubMilestoneRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (expanded && issues.length === 0) {
      fetchGitHubIssues(id).then((data) => setIssues(data as GitHubIssue[]));
    }
  }, [expanded, id, issues.length]);

  const displayedIssues = showAll ? issues : issues.slice(0, 5);
  const hiddenCount = issues.length - 5;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/60 border-b border-slate-100">
        <span className="flex-1 truncate text-sm font-medium text-slate-700">{title}</span>
        <span className="text-xs text-slate-500">{formatDueDate(dueOn)}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            state === 'open'
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {state}
        </span>
        {issueCount !== undefined && issueCount > 0 && (
          <button
            type="button"
            aria-label={`${issueCount} issues`}
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            {expanded ? '▾' : '▸'} {issueCount} issues
          </button>
        )}
      </div>

      {expanded && issues.length > 0 && (
        <div className="ml-6 border-l-2 border-slate-200 pl-3 py-1">
          {displayedIssues.map((issue) => (
            <GitHubIssueRow
              key={issue.id}
              number={issue.number}
              title={issue.title}
              assigneeLogin={issue.assigneeLogin}
              state={issue.state}
              labels={issue.labels}
              repoFullName={repoFullName}
            />
          ))}
          {!showAll && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs text-slate-500 hover:text-blue-600 px-3 py-1 transition-colors"
            >
              + {hiddenCount} more issues
            </button>
          )}
        </div>
      )}
    </div>
  );
}
