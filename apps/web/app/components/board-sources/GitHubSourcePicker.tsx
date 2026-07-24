'use client';

import { useState } from 'react';
import type { BulkBindRequest, PickerResponse, GitHubPickerError } from '@deckgauge/shared';
import { GitHubRepoPicker } from '../../boards/[boardId]/sources/components/GitHubRepoPicker';

export interface GitHubInstanceOption {
  id: string;
  label: string;
}

export interface BulkAttachResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export interface ReplaceTokenResult {
  ok: boolean;
  error?: string;
}

interface Props {
  boardId: string;
  instances: GitHubInstanceOption[];
  /** Runs the bulk bind + client refresh. Never rejects. */
  onBulkAttach: (req: BulkBindRequest) => Promise<BulkAttachResult>;
  /** Called after a successful bulk attach so the wizard can close. */
  onDone: () => void;
  /** Called when the user backs out of the picker. */
  onCancel: () => void;
  /**
   * Replaces the connection's access token (used to recover from an expired
   * PAT). Never rejects. When omitted, the token-replace form is not shown.
   */
  onReplaceToken?: (instanceId: string, token: string) => Promise<ReplaceTokenResult>;
  /** Test seam forwarded to GitHubRepoPicker; production uses the default fetcher. */
  fetcher?: (p: {
    pattern: string;
    page: number;
    includeArchived: boolean;
  }) => Promise<PickerResponse | GitHubPickerError>;
}

/**
 * GitHub's pick step in the "+ Add source" wizard. Discovers repos live from the
 * connection and provisions them through the bulk-bind path (tiering + backfill).
 * When the connection's token is expired (github_auth_failed), it surfaces the
 * error and offers an inline token-replace form so the user can recover without
 * leaving the wizard.
 */
export function GitHubSourcePicker({
  boardId,
  instances,
  onBulkAttach,
  onDone,
  onCancel,
  onReplaceToken,
  fetcher,
}: Props) {
  const [instanceId, setInstanceId] = useState(instances[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [newToken, setNewToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const selectInstance = (id: string) => {
    setInstanceId(id);
    setAuthFailed(false);
    setTokenError(null);
    setNewToken('');
  };

  const submit = async (req: Omit<BulkBindRequest, 'instanceId'>) => {
    if (pending || !instanceId) return;
    setPending(true);
    setError(null);
    const result = await onBulkAttach({ instanceId, ...req });
    setPending(false);
    if (result.ok) {
      onDone();
      return;
    }
    setError(result.error ?? 'Bulk add failed.');
  };

  const handlePickerError = (err: GitHubPickerError) => {
    setAuthFailed(err.code === 'github_auth_failed');
  };

  const replaceToken = async () => {
    if (!onReplaceToken || savingToken || newToken.trim().length === 0) return;
    setSavingToken(true);
    setTokenError(null);
    const result = await onReplaceToken(instanceId, newToken.trim());
    setSavingToken(false);
    if (result.ok) {
      setNewToken('');
      setAuthFailed(false);
      setReloadNonce((n) => n + 1); // remount the picker → refetch with the new token
      return;
    }
    setTokenError(result.error ?? 'Could not update the token.');
  };

  return (
    <div className="space-y-2">
      {instances.length > 1 && (
        <div>
          <label className="block text-[11px] text-slate-500" htmlFor="gh-instance">
            GitHub connection
          </label>
          <select
            id="gh-instance"
            aria-label="GitHub connection"
            className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200"
            value={instanceId}
            onChange={(e) => selectInstance(e.target.value)}
          >
            {instances.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}

      {authFailed && onReplaceToken && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">
            This GitHub connection&apos;s token is expired or invalid. Paste a new access token to
            reconnect.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              aria-label="New GitHub access token"
              placeholder="ghp_…"
              className="flex-1 text-xs px-2 py-1.5 rounded-md border border-slate-300"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
            />
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50"
              disabled={savingToken || newToken.trim().length === 0}
              onClick={replaceToken}
            >
              {savingToken ? 'Updating…' : 'Update token & retry'}
            </button>
          </div>
          {tokenError && (
            <p className="text-xs text-rose-600" role="alert">
              {tokenError}
            </p>
          )}
        </div>
      )}

      <GitHubRepoPicker
        key={`${instanceId}:${reloadNonce}`}
        boardId={boardId}
        instanceId={instanceId}
        onCancel={onCancel}
        onSubmit={submit}
        onError={handlePickerError}
        fetcher={fetcher}
      />
    </div>
  );
}
