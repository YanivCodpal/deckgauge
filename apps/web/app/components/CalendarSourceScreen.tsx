'use client';

import { useEffect, useState } from 'react';
import type { BoardCalendarSourceConfig } from '@deckgauge/shared';
import {
  getCalendarSource,
  connectCalendarSource,
  disconnectCalendarSource,
  syncCalendarSource,
} from '../actions/calendar-source';

const GRAPH_EXPLORER_URL = 'https://developer.microsoft.com/en-us/graph/graph-explorer';

const BTN_PRIMARY =
  'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50';
const BTN_SECONDARY =
  'rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';

function connectErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_token':
      return "That token wasn't accepted by Microsoft. Copy a fresh Access token from Graph Explorer and try again.";
    case 'unauthorized':
      return 'Your session expired. Please reload and sign in again.';
    default:
      return 'Could not save the connection. Please try again.';
  }
}

export function CalendarSourceScreen({ boardId }: { boardId: string }) {
  const [config, setConfig] = useState<BoardCalendarSourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarUpn, setCalendarUpn] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showTokenBox, setShowTokenBox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCalendarSource(boardId).then((c) => {
      if (cancelled) return;
      setConfig(c);
      if (c) setCalendarUpn(c.calendarUpn);
      setShowTokenBox(!c?.connected);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const connect = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setBanner(null);
    try {
      const result = await connectCalendarSource(boardId, token.trim(), calendarUpn.trim());
      if (result.ok) {
        setConfig(result.config);
        setCalendarUpn(result.config.calendarUpn);
        setToken('');
        setShowTokenBox(false);
        setBanner({ kind: 'ok', text: 'Calendar connected. Use Sync now to pull interviews.' });
      } else {
        setBanner({ kind: 'error', text: connectErrorMessage(result.error) });
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const updated = await disconnectCalendarSource(boardId);
      setConfig(updated);
      setShowTokenBox(true);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const result = await syncCalendarSource(boardId);
      if (result.enqueued) {
        setConfig((c) => (c ? { ...c, status: 'syncing' } : c));
        setBanner({ kind: 'ok', text: 'Sync started — interviews will appear shortly.' });
      } else {
        setBanner({ kind: 'error', text: 'Could not start the sync. Please try again.' });
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-400">Loading…</div>;

  const connected = Boolean(config?.connected);
  const status = config?.status ?? 'idle';

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
          Open <span className="font-medium">&quot;Modify permissions&quot;</span> and consent to{' '}
          <span className="font-medium">Calendars.Read</span>. A default Graph Explorer token only
          has <span className="font-medium">User.Read</span>, so calendar reads return{' '}
          <span className="font-medium">403</span> until you add this scope.
        </li>
        <li>
          Run <code className="rounded bg-slate-100 px-1">GET /me/calendarView</code> once and
          confirm it returns <span className="font-medium">200</span> (not 403).
        </li>
        <li>
          Copy the token from the <span className="font-medium">&quot;Access token&quot;</span> tab,
          paste it below, and Connect. (The token lasts about an hour; re-paste to re-sync.)
        </li>
      </ol>
      <textarea
        aria-label="Microsoft Graph access token"
        className="mt-2 h-24 w-full rounded border border-slate-300 px-2 py-1 font-mono text-[12px]"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your Microsoft Graph access token here"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={connect}
          disabled={busy || !token.trim()}
          className={BTN_PRIMARY}
        >
          Connect
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
    <div>
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

      <div className="text-sm font-semibold text-slate-700">Microsoft calendar</div>
      <p className="mt-1 text-[12px] text-slate-400">
        Connect a Microsoft calendar to pull interviews into candidate rows.
      </p>

      {status === 'error' && (
        <div
          role="alert"
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
        >
          <div className="font-medium">Last sync failed</div>
          <div>
            {config?.lastError ?? 'The last calendar sync failed. Try syncing again.'}
          </div>
          <div className="mt-1 text-[12px] text-red-600">
            If this is a permissions error, re-check that your Graph token consented to
            Calendars.Read, then paste a fresh token above.
          </div>
        </div>
      )}

      {connected && !showTokenBox ? (
        <div className="mt-2 flex items-center justify-between rounded border border-slate-200 p-3">
          <div className="text-[13px] text-slate-600">
            <div>
              Connected — calendar <span className="font-medium">{config?.calendarUpn}</span>
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

      {/* Calendar owner */}
      <div className="mt-4">
        <label className="block text-[13px] text-slate-600" htmlFor="calendarUpn">
          Calendar owner (email / UPN)
        </label>
        <input
          id="calendarUpn"
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={calendarUpn}
          onChange={(e) => setCalendarUpn(e.target.value)}
          placeholder="recruiter@example.com"
        />
        <p className="mt-1 text-[12px] text-slate-400">
          Interviews on this person&apos;s calendar are pulled in.
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
          disabled={busy || status === 'syncing' || !connected}
          title={!connected ? 'Connect a Microsoft calendar first' : undefined}
          className={BTN_PRIMARY}
        >
          Sync now
        </button>
      </div>
    </div>
  );
}
