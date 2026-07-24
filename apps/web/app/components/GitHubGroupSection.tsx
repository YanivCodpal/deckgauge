'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchGitHubSyncConfigs,
  fetchGitHubMilestones,
  fetchGitHubSyncStatus,
  triggerGitHubSync,
} from '../actions/github';
import { GitHubMilestoneRow } from './GitHubMilestoneRow';

interface GitHubSyncConfig {
  id: string;
  repoFullName: string;
  boardId: string;
  githubInstanceId: string;
  targetGroupId: string | null;
  allowedLabels: string[];
  includeClosedIssues: boolean;
  defaultSyncedFields: string[];
}

interface GitHubMilestone {
  id: string;
  repoFullName: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  dueOn: string | null;
  updatedAt: string;
}

interface GitHubGroupSectionProps {
  searchQuery?: string;
}

export function GitHubGroupSection({ searchQuery = '' }: GitHubGroupSectionProps) {
  const [repos, setRepos] = useState<string[]>([]);
  const [milestonesByRepo, setMilestonesByRepo] = useState<Record<string, GitHubMilestone[]>>({});
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  const [loadedRepos, setLoadedRepos] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ status: string; errorMessage?: string | null } | null>(null);

  useEffect(() => {
    loadConfigs();
    loadSyncStatus();
  }, []);

  async function loadConfigs() {
    setIsLoading(true);
    const configs: GitHubSyncConfig[] = await fetchGitHubSyncConfigs();
    const uniqueRepos = [...new Set(configs.map((c) => c.repoFullName))];
    setRepos(uniqueRepos);
    setIsLoading(false);
  }

  async function loadSyncStatus() {
    const status = await fetchGitHubSyncStatus();
    setSyncStatus(status);
  }

  async function loadMilestones(repo: string) {
    if (loadedRepos.has(repo)) return;
    const milestones: GitHubMilestone[] = await fetchGitHubMilestones(repo);
    setMilestonesByRepo((prev) => ({ ...prev, [repo]: milestones }));
    setLoadedRepos((prev) => new Set([...prev, repo]));
  }

  function toggleRepo(repo: string) {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repo)) {
        next.delete(repo);
      } else {
        next.add(repo);
        loadMilestones(repo);
      }
      return next;
    });
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      await triggerGitHubSync();
      // Reload milestones and status after sync completes
      setLoadedRepos(new Set());
      for (const repo of expandedRepos) {
        const milestones: GitHubMilestone[] = await fetchGitHubMilestones(repo);
        setMilestonesByRepo((prev) => ({ ...prev, [repo]: milestones }));
        setLoadedRepos((prev) => new Set([...prev, repo]));
      }
      await loadSyncStatus();
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading || repos.length === 0) return null;

  return (
    <div className="space-y-3">
      {repos.map((repo) => {
        const milestones = milestonesByRepo[repo] ?? [];
        const isExpanded = expandedRepos.has(repo);

        const filtered = searchQuery
          ? milestones.filter((m) =>
              m.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
          : milestones;

        if (searchQuery && isExpanded && filtered.length === 0) return null;

        return (
          <div key={repo} className="glass border-slate-200">
            <div className="px-4 py-3 flex items-center gap-2.5">
              <button
                type="button"
                aria-label={`expand ${repo}`}
                onClick={() => toggleRepo(repo)}
                className="text-slate-500 hover:text-slate-600 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6 4l8 6-8 6V4z" />
                </svg>
              </button>
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: '#6e40c9' }}
              />
              <span className="text-sm font-semibold text-purple-700">
                {'⑂ '}
                <span data-repo={repo}>{repo}</span>
              </span>
              {isExpanded && milestones.length > 0 && (
                <span className="text-xs text-slate-500">
                  ({milestones.length} milestones)
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                {syncStatus?.status === 'failed' ? (
                  <span
                    className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-help"
                    title={syncStatus.errorMessage ?? 'Sync failed'}
                  >
                    SYNC FAILED
                  </span>
                ) : (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    SYNCED
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="btn-secondary text-xs py-0.5 px-2 flex items-center gap-1"
                >
                  <span className={isSyncing ? 'animate-spin' : ''}>↻</span>
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
              </span>
            </div>

            {isExpanded && (
              <div>
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-4">
                    No milestones synced
                  </p>
                ) : (
                  filtered.map((milestone) => (
                    <GitHubMilestoneRow
                      key={milestone.id}
                      id={milestone.id}
                      title={milestone.title}
                      dueOn={milestone.dueOn}
                      state={milestone.state}
                      repoFullName={repo}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
