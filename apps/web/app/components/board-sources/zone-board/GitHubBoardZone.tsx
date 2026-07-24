'use client';
import { useEffect, useState } from 'react';
import { LabelChipPicker } from '../primitives/LabelChipPicker';
import { TypeChipPicker } from '../primitives/TypeChipPicker';
import { StatusMappingLink } from '../primitives/StatusMappingLink';
import {
  fetchSourceGitHubLabels,
  fetchSourceGitHubIssueTypes,
} from '../../../actions/board-sources';
import type { BoardStatusOption } from '../StatusMappingEditor';

export interface GitHubZoneValue {
  syncIssuesToBoard: boolean;
  targetGroupId: string | null;
  allowedLabels: string[];
  allowedTypes: string[];
  includeClosedIssues: boolean;
  statusMapping: Record<string, string>;
}

interface Props {
  value: GitHubZoneValue;
  groups: Array<{ id: string; name: string }>;
  onChange: (next: GitHubZoneValue) => void;
  previewCount: number | null;
  boardId: string;
  sourceId: string;
  boardStatuses: BoardStatusOption[];
  onSaveStatusMapping: (mapping: Record<string, string>) => Promise<void>;
}

export function GitHubBoardZone({
  value,
  groups,
  onChange,
  previewCount,
  boardId,
  sourceId,
  boardStatuses,
  onSaveStatusMapping,
}: Props) {
  const patch = <K extends keyof GitHubZoneValue>(k: K, v: GitHubZoneValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-2">
        → BOARD CONTENT
      </div>
      <label className={`flex items-center gap-3 px-3 py-2 rounded-md border ${
        value.syncIssuesToBoard ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
      }`}>
        <input
          role="switch"
          type="checkbox"
          checked={value.syncIssuesToBoard}
          onChange={(e) => patch('syncIssuesToBoard', e.target.checked)}
        />
        <span className="font-semibold text-sm text-slate-900">Sync issues to this board</span>
        <span className={`ml-auto text-xs ${value.syncIssuesToBoard ? 'text-indigo-700 font-medium' : 'text-slate-500'}`}>
          {value.syncIssuesToBoard ? 'ON' : 'OFF'}
        </span>
      </label>

      <div className={`mt-3 space-y-2 ${value.syncIssuesToBoard ? '' : 'opacity-50 pointer-events-none'}`}>
        <Row label="Target group">
          <select
            className="text-xs border border-slate-200 rounded-md px-2 py-1"
            value={value.targetGroupId ?? ''}
            onChange={(e) => patch('targetGroupId', e.target.value || null)}
          >
            <option value="">(none)</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Row>
        <IssueTypesRow
          boardId={boardId}
          sourceId={sourceId}
          value={value.allowedTypes}
          onChange={(next) => patch('allowedTypes', next)}
        />
        <Row label="Allowed labels">
          <LabelChipsBlock
            boardId={boardId}
            sourceId={sourceId}
            value={value.allowedLabels}
            onChange={(next) => patch('allowedLabels', next)}
          />
        </Row>
        <Row label="Include closed">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={value.includeClosedIssues}
              onChange={(e) => patch('includeClosedIssues', e.target.checked)}
            />
            {value.includeClosedIssues ? 'on' : 'off'}
          </label>
        </Row>
        <Row label="Status mapping">
          <StatusMappingLink
            mapping={value.statusMapping}
            boardId={boardId}
            sourceId={sourceId}
            provider="github"
            boardStatuses={boardStatuses}
            onChange={(m) => patch('statusMapping', m)}
            onSave={onSaveStatusMapping}
          />
        </Row>

        {previewCount != null && (
          <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            ~{previewCount} issues currently match this filter
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center text-xs">
      <span className="text-slate-500 text-[11px]">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function LabelChipsBlock({
  boardId,
  sourceId,
  value,
  onChange,
}: {
  boardId: string;
  sourceId: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    fetchSourceGitHubLabels(boardId, sourceId)
      .then((res) => setSuggestions(res.labels))
      .catch(() => setSuggestions([]));
  }, [boardId, sourceId]);
  return <LabelChipPicker value={value} onChange={onChange} suggestions={suggestions} />;
}

function IssueTypesRow({
  boardId,
  sourceId,
  value,
  onChange,
}: {
  boardId: string;
  sourceId: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; options: string[] }
    | { kind: 'error' }
  >({ kind: 'loading' });

  const load = () => {
    setState({ kind: 'loading' });
    fetchSourceGitHubIssueTypes(boardId, sourceId)
      .then((res) => setState({ kind: 'ready', options: res.types }))
      .catch(() => setState({ kind: 'error' }));
  };

  useEffect(() => {
    load();
  }, [boardId, sourceId]);

  // Hide the row entirely when org returns [] AND value is empty —
  // most repos don't use org-level Issue Types and shouldn't see noise.
  if (state.kind === 'ready' && state.options.length === 0 && value.length === 0) {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <Row label="Issue types">
        <div
          role="status"
          aria-label="Loading issue types"
          className="h-5 w-32 rounded bg-slate-100 animate-pulse"
        />
      </Row>
    );
  }
  if (state.kind === 'error') {
    return (
      <Row label="Issue types">
        <div className="text-xs text-slate-500">
          Couldn&apos;t load issue types.{' '}
          <button
            type="button"
            onClick={load}
            className="text-indigo-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </Row>
    );
  }
  // Merge live options with stale values so existing config never silently disappears.
  const merged = Array.from(new Set([...state.options, ...value])).sort();
  return (
    <Row label="Issue types">
      <TypeChipPicker options={merged} value={value} onChange={onChange} />
    </Row>
  );
}
