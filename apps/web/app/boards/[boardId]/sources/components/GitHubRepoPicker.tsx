'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  PickerRepo,
  PickerResponse,
  BulkBindRequest,
  GitHubPickerError,
} from '@deckgauge/shared';
import { listGitHubPicker } from '@/app/actions/github-sources';

export interface GitHubRepoPickerProps {
  boardId: string;
  instanceId: string;
  onSubmit: (req: Omit<BulkBindRequest, 'instanceId'>) => void;
  onCancel?: () => void;
  /** Notified when the picker fetch fails (e.g. an expired-token 401). */
  onError?: (err: GitHubPickerError) => void;
  fetcher?: (p: {
    pattern: string;
    page: number;
    includeArchived: boolean;
  }) => Promise<PickerResponse | GitHubPickerError>;
}

// Repos in this org are named `clt-demo-*` / `cas-demo-*`, so a prefix
// glob (`demo*`) matches nothing — default to a contains glob.
const DEFAULT_PATTERN = '*demo*';
const DEBOUNCE_MS = 400;

export function GitHubRepoPicker(props: GitHubRepoPickerProps) {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [debouncedPattern, setDebouncedPattern] = useState(DEFAULT_PATTERN);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [data, setData] = useState<PickerResponse | null>(null);
  const [error, setError] = useState<GitHubPickerError | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [backfillMonths, setBackfillMonths] = useState(12);

  const fetcher =
    props.fetcher ??
    ((p: { pattern: string; page: number; includeArchived: boolean }) =>
      listGitHubPicker(props.boardId, { instanceId: props.instanceId, ...p }));

  // Debounce the filter input so we don't re-query GitHub (which paginates the
  // whole org) on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPattern(pattern), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [pattern]);

  const { onError } = props;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher({ pattern: debouncedPattern, page: 1, includeArchived })
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (result && 'pickerError' in result) {
          setData(null);
          setError(result);
          onError?.(result);
        } else {
          setData(result);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPattern, includeArchived]);

  const selectableRepos: PickerRepo[] = useMemo(
    () => (data?.repos ?? []).filter((r) => !r.enabled),
    [data],
  );

  const toggle = (fn: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fn)) next.delete(fn);
      else next.add(fn);
      return next;
    });

  const selectAll = () => setSelected(new Set(selectableRepos.map((r) => r.fullName)));

  const clear = () => setSelected(new Set());

  if (error)
    return (
      <div
        className="p-6 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700"
        role="alert"
      >
        {error.message}
      </div>
    );
  if (!data) return <div className="p-8 text-center">Loading…</div>;

  return (
    <div className="github-repo-picker p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium mb-1">
          Filter
          {loading && (
            <span className="flex items-center gap-1 text-xs font-normal text-blue-600" role="status">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
              Searching…
            </span>
          )}
        </label>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="*demo*"
          className="border rounded px-3 py-2 w-full"
        />
        <p className="mt-1 text-xs text-gray-400">
          Glob match on repo name — e.g. <code>*demo*</code> or <code>clt-*</code>. Clear to
          list all.
        </p>
      </div>
      <div className="mb-2 flex gap-2 items-center text-sm">
        <label>
          <input
            type="checkbox"
            checked={!includeArchived}
            onChange={() => setIncludeArchived((v) => !v)}
          />{' '}
          Active only
        </label>
        <span className="ml-auto">
          <button
            onClick={selectAll}
            disabled={loading}
            className="px-2 py-1 bg-blue-50 rounded disabled:opacity-40"
          >
            Select all visible ({selectableRepos.length})
          </button>
          <button onClick={clear} className="px-2 py-1 bg-gray-100 rounded ml-2">
            Clear
          </button>
        </span>
      </div>
      {data.repos.length === 0 && !loading ? (
        <div className="border rounded p-6 text-center text-sm text-gray-500">
          No repositories match “{debouncedPattern || '*'}”.
        </div>
      ) : (
      <ul
        className={`border rounded divide-y max-h-96 overflow-y-auto transition-opacity ${
          loading ? 'opacity-40 pointer-events-none' : ''
        }`}
        aria-busy={loading}
      >
        {data.repos.map((r) => (
          <li key={r.fullName} className="flex items-center p-2 gap-2">
            <input
              type="checkbox"
              checked={r.enabled || selected.has(r.fullName)}
              disabled={r.enabled}
              onChange={() => toggle(r.fullName)}
            />
            <span className="flex-1">{r.fullName}</span>
            <span className="text-xs text-gray-500">{r.language ?? ''}</span>
            <span className="text-xs text-gray-500">
              {r.lastPushedAt ? new Date(r.lastPushedAt).toLocaleDateString() : '—'}
            </span>
            {r.archived && <span className="text-xs bg-gray-200 rounded px-1">archived</span>}
            {r.enabled && <span className="text-xs bg-green-100 rounded px-1">added</span>}
          </li>
        ))}
      </ul>
      )}
      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm">Backfill months</label>
        <select
          value={backfillMonths}
          onChange={(e) => setBackfillMonths(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          <option value={3}>3</option>
          <option value={6}>6</option>
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={60}>60</option>
        </select>
        <button onClick={props.onCancel} className="ml-auto px-4 py-2 border rounded">
          Cancel
        </button>
        <button
          onClick={() => props.onSubmit({ repos: [...selected], backfillMonths })}
          disabled={selected.size === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
        >
          Add {selected.size} repos to board
        </button>
      </div>
    </div>
  );
}
