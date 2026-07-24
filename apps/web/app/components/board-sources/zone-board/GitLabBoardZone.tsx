'use client';

export interface GitLabZoneValue {
  syncIssuesToBoard: boolean;
  syncMrsToBoard: boolean;
  targetGroupId: string | null;
}

interface Props {
  value: GitLabZoneValue;
  groups: Array<{ id: string; name: string }>;
  onChange: (next: GitLabZoneValue) => void;
  previewCount: number | null;
}

export function GitLabBoardZone({ value, groups, onChange, previewCount }: Props) {
  const patch = <K extends keyof GitLabZoneValue>(k: K, v: GitLabZoneValue[K]) =>
    onChange({ ...value, [k]: v });
  const anyOn = value.syncIssuesToBoard || value.syncMrsToBoard;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-2">
        → BOARD CONTENT
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-3 px-3 py-2 rounded-md border border-slate-200 bg-white">
          <input
            role="switch"
            type="checkbox"
            checked={value.syncIssuesToBoard}
            onChange={(e) => patch('syncIssuesToBoard', e.target.checked)}
          />
          <span className="font-semibold text-sm text-slate-900">Sync issues</span>
          <span className="ml-auto text-xs text-slate-500">{value.syncIssuesToBoard ? 'ON' : 'OFF'}</span>
        </label>
        <label className="flex items-center gap-3 px-3 py-2 rounded-md border border-slate-200 bg-white">
          <input
            role="switch"
            type="checkbox"
            checked={value.syncMrsToBoard}
            onChange={(e) => patch('syncMrsToBoard', e.target.checked)}
          />
          <span className="font-semibold text-sm text-slate-900">Sync merge requests</span>
          <span className="ml-auto text-xs text-slate-500">{value.syncMrsToBoard ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      <div className={`mt-3 ${anyOn ? '' : 'opacity-50 pointer-events-none'}`}>
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
        {previewCount != null && (
          <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            ~{previewCount} items currently match
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
