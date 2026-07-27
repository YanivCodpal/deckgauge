'use client';
import { useState } from 'react';
import { TokenTutorial } from './providers/TokenTutorial';
import { PROVIDER_LABEL, type Provider } from './providers/roles';

export interface SourceReconnectBannerProps {
  provider: Provider;
  /** Provider message (e.g. a 401 text). Falls back to a default. */
  message?: string;
  /** Never rejects. */
  onReplaceToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  /** Called after a successful replace (e.g. to refetch). */
  onSuccess?: () => void;
}

export function SourceReconnectBanner({
  provider,
  message,
  onReplaceToken,
  onSuccess,
}: SourceReconnectBannerProps) {
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = PROVIDER_LABEL[provider];
  const defaultMessage = `This ${label} connection's token is expired or invalid. Paste a new access token to reconnect.`;

  const replace = async () => {
    const trimmed = token.trim();
    if (saving || trimmed.length === 0) return;
    setSaving(true);
    setError(null);
    const result = await onReplaceToken(trimmed);
    setSaving(false);
    if (result.ok) {
      setToken('');
      onSuccess?.();
      return;
    }
    setError(result.error ?? 'Could not update the token.');
  };

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
      <p className="text-xs font-medium text-amber-800" role="alert">
        {message ?? defaultMessage}
      </p>
      <TokenTutorial provider={provider} mode="reconnect" />
      <div className="flex gap-2">
        <input
          type="password"
          aria-label={`New ${label} access token`}
          placeholder="Paste new token"
          className="flex-1 text-xs px-2 py-1.5 rounded-md border border-slate-300"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50"
          disabled={saving || token.trim().length === 0}
          onClick={replace}
        >
          {saving ? 'Updating…' : 'Update token & retry'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
