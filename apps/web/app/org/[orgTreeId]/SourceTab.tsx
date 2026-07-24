'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrgSourceConfig } from '@deckgauge/shared';
import {
  getOrgSource,
  saveOrgSource,
  triggerOrgSourceSync,
  disconnectOrgSource,
  saveGraphToken,
} from '../../actions/employee-source';
import { triggerOrgTreeSync, getOrgTreeSyncStatus } from '../../actions/org-trees';
import { pollUntil } from './poll-until';

const GRAPH_EXPLORER_URL = 'https://developer.microsoft.com/en-us/graph/graph-explorer';

const BTN_PRIMARY =
  'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50';
const BTN_SECONDARY =
  'rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';

function tokenErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_token':
      return "That token wasn't accepted by Microsoft. Copy a fresh Access token from Graph Explorer and try again.";
    case 'unauthorized':
      return 'Your session expired. Please reload and sign in again.';
    default:
      return 'Could not save the token. Please try again.';
  }
}

export function SourceTab({ treeId }: { treeId: string }) {
  const router = useRouter();
  const [config, setConfig] = useState<OrgSourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [rootUpn, setRootUpn] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [token, setToken] = useState('');
  const [showTokenBox, setShowTokenBox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOrgSource(treeId).then((c) => {
      if (cancelled) return;
      setConfig(c);
      if (c) setRootUpn(c.rootUpn);
      setShowTokenBox(!c?.connected);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [treeId]);

  const saveToken = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setBanner(null);
    try {
      const result = await saveGraphToken(treeId, token.trim());
      if (result.ok) {
        setConfig(result.config);
        setToken('');
        setShowTokenBox(false);
        setBanner({ kind: 'ok', text: 'Microsoft token saved. Set the root person and Sync.' });
      } else {
        setBanner({ kind: 'error', text: tokenErrorMessage(result.error) });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveRoot = async () => {
    if (!rootUpn.trim()) return;
    setBusy(true);
    try {
      const saved = await saveOrgSource(treeId, rootUpn.trim());
      if (saved) setConfig(saved);
    } finally {
      setBusy(false);
    }
  };

  // A full sync is a two-step chain: pull people from Microsoft Graph, then
  // match the refreshed roster against the boards. Both run on the worker; we
  // poll each to completion and refresh the page in between so the org chart and
  // the boards update on their own — no manual browser reload, no second click.
  const sync = async () => {
    setBusy(true);
    setBanner({ kind: 'ok', text: 'Syncing people from Microsoft…' });
    try {
      // Step 1 — Microsoft Graph source sync. status flips 'syncing' → 'idle'/'error'.
      await triggerOrgSourceSync(treeId);
      setConfig((c) => (c ? { ...c, status: 'syncing' } : c));
      const finalCfg = await pollUntil(
        () => getOrgSource(treeId),
        (c) => c.status !== 'syncing',
      );
      if (finalCfg) setConfig(finalCfg);
      router.refresh();

      if (finalCfg?.status === 'error') {
        setBanner({ kind: 'error', text: 'Microsoft sync failed — see details below.' });
        return;
      }
      if (finalCfg?.status === 'syncing') {
        // Poll budget exhausted before the worker finished. The job is still
        // running; the roster will fill in — nudge the page and stop here rather
        // than matching boards against a partial roster.
        setBanner({ kind: 'ok', text: 'Still syncing people in the background…' });
        return;
      }

      // Step 2 — match the refreshed roster against the boards. getSyncStatus
      // never reports a 'running' state, so completion is a lastSyncedAt bump.
      setBanner({ kind: 'ok', text: 'People updated. Matching boards…' });
      const baseline = (await getOrgTreeSyncStatus(treeId))?.lastSyncedAt ?? null;
      await triggerOrgTreeSync(treeId);
      await pollUntil(
        () => getOrgTreeSyncStatus(treeId),
        (s) => s.lastSyncedAt !== baseline,
      );
      router.refresh();
      setBanner({ kind: 'ok', text: 'Sync complete — people and boards are up to date.' });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const updated = await disconnectOrgSource(treeId);
      setConfig(updated);
      setShowTokenBox(true);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-400">Loading…</div>;

  const connected = Boolean(config?.connected);
  const status = config?.status ?? 'idle';
  const hasRoot = Boolean(config?.rootUpn);
  const s = config?.lastSyncSummary;

  const tokenBox = (
    <div className="mt-2 rounded border border-slate-200 p-3">
      <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-600">
        <li>
          Open{' '}
          <a
            href={GRAPH_EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-700 underline"
          >
            Microsoft Graph Explorer
          </a>{' '}
          and sign in with your Microsoft account.
        </li>
        <li>
          Click the <span className="font-medium">&quot;Access token&quot;</span> tab and copy the
          token.
        </li>
        <li>Paste it below and Save. (The token lasts about an hour; re-paste to re-sync.)</li>
      </ol>
      <textarea
        aria-label="Microsoft Graph access token"
        className="mt-2 h-24 w-full rounded border border-slate-300 px-2 py-1 font-mono text-[12px]"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your Microsoft Graph access token here"
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={saveToken} disabled={busy || !token.trim()} className={BTN_PRIMARY}>
          Save token
        </button>
        {connected && (
          <button
            type="button"
            onClick={() => setShowTokenBox(false)}
            disabled={busy}
            className={BTN_SECONDARY}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-xl p-4">
      {banner && (
        <div
          className={`mb-3 rounded border px-3 py-2 text-[13px] ${
            banner.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="text-sm font-semibold text-slate-700">Microsoft Entra</div>

      {connected && !showTokenBox ? (
        <div className="mt-2 flex items-center justify-between rounded border border-slate-200 p-3">
          <div className="text-[13px] text-slate-600">
            <div>
              Connected as <span className="font-medium">{config?.microsoftUpn}</span>
            </div>
            {config?.connectedByEmail && (
              <div className="text-[12px] text-slate-400">by {config.connectedByEmail}</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowTokenBox(true)}
              disabled={busy}
              className={BTN_SECONDARY}
            >
              Update token
            </button>
            <button type="button" onClick={disconnect} disabled={busy} className={BTN_SECONDARY}>
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        tokenBox
      )}

      {/* Root person */}
      <div className="mt-4">
        <label className="block text-[13px] text-slate-600" htmlFor="rootUpn">
          Root person (email / UPN)
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="rootUpn"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={rootUpn}
            onChange={(e) => setRootUpn(e.target.value)}
            placeholder="vp@example.com"
          />
          <button
            type="button"
            onClick={saveRoot}
            disabled={busy || !rootUpn.trim()}
            className={BTN_SECONDARY}
          >
            Save
          </button>
        </div>
        <p className="mt-1 text-[12px] text-slate-400">
          Everyone reporting up to this person is pulled in.
        </p>
      </div>

      {/* Sync */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[12px] text-slate-400">
          {status === 'syncing'
            ? 'Syncing…'
            : config?.lastSyncedAt
              ? `Last synced ${new Date(config.lastSyncedAt).toLocaleString()}`
              : 'Never synced'}
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={busy || status === 'syncing' || !connected || !hasRoot}
          title={
            !connected
              ? 'Paste a Microsoft token first'
              : !hasRoot
                ? 'Set the root person first'
                : undefined
          }
          className={BTN_PRIMARY}
        >
          Sync now
        </button>
      </div>

      {s && (
        <div className="mt-4 rounded border border-slate-200 p-3 text-[13px] text-slate-600">
          <div>
            Created {s.created} · Updated {s.updated} · Departed {s.departed} · Skipped {s.skipped}
          </div>
          {s.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600">
              {s.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
