'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importOrgChart, triggerOrgTreeSync, getOrgTreeSyncStatus } from '@/app/actions/org-trees';
import { pollUntil } from './poll-until';

interface OrgTreeToolbarProps {
  treeId: string;
  lastSyncedAt: string | null;
}

export function OrgTreeToolbar({ treeId, lastSyncedAt }: OrgTreeToolbarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{
    lastSyncedAt: string | null;
    matched: number;
    total: number;
  } | null>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await importOrgChart(treeId, fd);
      setImportMsg(`Imported: ${result.created} created, ${result.updated} updated`);
    } catch {
      setImportMsg('Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      // getSyncStatus never reports a 'running' state, so we can't poll on state.
      // Completion is a lastSyncedAt bump past the value we saw before triggering.
      const baseline = (await getOrgTreeSyncStatus(treeId))?.lastSyncedAt ?? lastSyncedAt ?? null;
      await triggerOrgTreeSync(treeId);
      const status = await pollUntil(
        () => getOrgTreeSyncStatus(treeId),
        (s) => s.lastSyncedAt !== baseline,
        (s) => setSyncInfo({ lastSyncedAt: s.lastSyncedAt, matched: s.matched, total: s.total }),
      );
      if (status) {
        setSyncInfo({
          lastSyncedAt: status.lastSyncedAt,
          matched: status.matched,
          total: status.total,
        });
      }
      // Reflect the freshly-matched roster (green dots, last-commit) without a
      // manual browser refresh — re-runs the org page's server data fetch.
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const displayLastSynced = syncInfo?.lastSyncedAt ?? lastSyncedAt;
  const displayMatched = syncInfo ? `${syncInfo.matched}/${syncInfo.total} matched` : null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5">
      <label className="flex cursor-pointer items-center gap-2">
        <span className="btn-secondary text-xs py-1.5 px-3">
          {importing ? 'Importing…' : 'Import Chart'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={handleImport}
          disabled={importing}
        />
      </label>

      {importMsg && <span className="text-xs text-slate-500">{importMsg}</span>}

      <button
        onClick={handleSync}
        disabled={syncing}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {syncing ? 'Syncing…' : 'Sync'}
      </button>

      {(displayLastSynced || displayMatched) && (
        <span className="text-xs text-slate-500">
          {displayLastSynced && <>Last synced {displayLastSynced?.slice(0, 10)}</>}
          {displayLastSynced && displayMatched && ' · '}
          {displayMatched}
        </span>
      )}
    </div>
  );
}
