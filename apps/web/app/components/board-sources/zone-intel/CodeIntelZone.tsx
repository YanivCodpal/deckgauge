'use client';
import { useState } from 'react';
import Link from 'next/link';

export interface ConnectionState {
  syncPrs: boolean;
  syncCommits: boolean;
  syncRepos?: string[]; // ADO only
  syncAllRepos?: boolean; // ADO only
  aiAssistDetectedPct?: number | null;
}

interface Props {
  useForIntelligence: boolean;
  onChange: (next: boolean) => void;
  connectionState: ConnectionState;
  lastSyncedAt: string | null;
  manageHref: string;
  // ADO only: when set, the PRs/Commits/repos scope is edited inline (persisted
  // to the shared project sync) instead of being read-only with a link out to
  // the Connections page. Requires `onConnectionChange`.
  editableConnection?: boolean;
  onConnectionChange?: (next: ConnectionState) => void;
}

function parseRepos(text: string): string[] {
  return text
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}

function dotClass(on: boolean) {
  return `inline-block w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`;
}

function rowStateLabel(connectionOn: boolean, used: boolean) {
  if (!connectionOn) return 'Not enabled';
  return used ? 'Syncing' : 'Available (skipped)';
}

export function CodeIntelZone({
  useForIntelligence,
  onChange,
  connectionState,
  lastSyncedAt,
  manageHref,
  editableConnection,
  onConnectionChange,
}: Props) {
  const anyAvailable = connectionState.syncPrs || connectionState.syncCommits;
  const used = useForIntelligence && anyAvailable;
  const editing = editableConnection === true && onConnectionChange !== undefined;

  return (
    <div className={`rounded-lg border border-slate-200 p-3 ${used ? '' : 'bg-slate-50'}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-700 mb-2 flex items-center gap-2">
        → INTELLIGENCE FEED
        {!anyAvailable && !editing && (
          <span className="text-[10px] text-slate-400 normal-case font-normal ml-auto">
            no code sync available on the connection
          </span>
        )}
      </div>

      <label
        className={`flex items-center gap-3 px-3 py-2 rounded-md border ${
          useForIntelligence ? 'bg-cyan-50 border-cyan-200' : 'bg-white border-slate-200'
        }`}
      >
        <input
          role="switch"
          type="checkbox"
          checked={useForIntelligence}
          disabled={!anyAvailable}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="font-semibold text-sm text-slate-900">Include code in Intelligence</span>
        <span
          className={`ml-auto text-xs ${
            useForIntelligence ? 'text-cyan-700 font-medium' : 'text-slate-500'
          }`}
        >
          {anyAvailable ? (useForIntelligence ? 'ON' : 'OFF') : 'unavailable'}
        </span>
      </label>

      {editing ? (
        <EditableCodeSync value={connectionState} onChange={onConnectionChange} />
      ) : (
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-28 text-slate-500">Pull requests</span>
            <span className={dotClass(used && connectionState.syncPrs)} />
            <span className="font-medium text-slate-900">
              {rowStateLabel(connectionState.syncPrs, used)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-28 text-slate-500">Commits</span>
            <span className={dotClass(used && connectionState.syncCommits)} />
            <span className="font-medium text-slate-900">
              {rowStateLabel(connectionState.syncCommits, used)}
            </span>
          </div>
          {connectionState.aiAssistDetectedPct != null && (
            <div className="flex items-center gap-2 text-xs">
              <span className="w-28 text-slate-500">AI-assist signal</span>
              <span className={dotClass(used)} />
              <span className="font-medium text-slate-900">
                Detected on {connectionState.aiAssistDetectedPct}% of PRs
              </span>
            </div>
          )}
          {connectionState.syncRepos && connectionState.syncRepos.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="w-28 text-slate-500">Repos</span>
              <span className="flex flex-wrap gap-1">
                {connectionState.syncRepos.map((r) => (
                  <span
                    key={r}
                    className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px]"
                  >
                    {r}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex text-[11px] text-slate-400">
        {lastSyncedAt ? `Last code sync: ${lastSyncedAt}` : 'No sync yet'}
        <Link href={manageHref} className="ml-auto text-cyan-700 font-medium">
          manage in Connections ↗
        </Link>
      </div>
    </div>
  );
}

// ADO-only inline editor for the shared project sync's code-sync scope. Holds a
// local text buffer for the repo list so typing a comma isn't re-parsed
// mid-keystroke; parsed values are pushed up on every change.
function EditableCodeSync({
  value,
  onChange,
}: {
  value: ConnectionState;
  onChange: (next: ConnectionState) => void;
}) {
  const [reposText, setReposText] = useState((value.syncRepos ?? []).join(', '));
  const allRepos = value.syncAllRepos ?? false;

  const toggle = (key: 'syncPrs' | 'syncCommits' | 'syncAllRepos', checked: boolean) =>
    onChange({ ...value, [key]: checked });

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5 text-slate-700">
          <input
            type="checkbox"
            checked={value.syncPrs}
            onChange={(e) => toggle('syncPrs', e.target.checked)}
          />
          Pull requests
        </label>
        <label className="flex items-center gap-1.5 text-slate-700">
          <input
            type="checkbox"
            checked={value.syncCommits}
            onChange={(e) => toggle('syncCommits', e.target.checked)}
          />
          Commits
        </label>
        <label className="flex items-center gap-1.5 text-slate-700">
          <input
            type="checkbox"
            checked={allRepos}
            onChange={(e) => toggle('syncAllRepos', e.target.checked)}
          />
          All repositories
        </label>
      </div>
      <input
        aria-label="Repositories"
        value={reposText}
        disabled={allRepos}
        placeholder="repo1, repo2 — leave blank to pick later"
        onChange={(e) => {
          setReposText(e.target.value);
          onChange({ ...value, syncRepos: parseRepos(e.target.value) });
        }}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
      />
      <p className="text-[10px] text-slate-400">
        Code-sync scope is shared — changes apply to every board using this Azure DevOps project.
      </p>
    </div>
  );
}
