'use client';
import { useState } from 'react';
import { PROVIDER_CONNECTION_FIELDS, requiredKeys } from './providers/connection-fields';
import { PROVIDER_LABEL, type Provider } from './providers/roles';
import { TokenTutorial } from './providers/TokenTutorial';

interface Props {
  provider: Provider;
  busy: boolean;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

function initialValues(provider: Provider): Record<string, string> {
  const seed: Record<string, string> = {};
  for (const f of PROVIDER_CONNECTION_FIELDS[provider]) {
    if (f.type === 'select' && f.options?.[0]) seed[f.key] = f.options[0].value;
  }
  return seed;
}

export function AddConnectionForm({ provider, busy, onSubmit, onCancel }: Props) {
  const fields = PROVIDER_CONNECTION_FIELDS[provider];
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(provider));
  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const complete = requiredKeys(provider).every((k) => (values[k] ?? '').trim().length > 0);

  const submit = () => {
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (v.length > 0) payload[f.key] = v;
    }
    onSubmit(payload);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">
        New {PROVIDER_LABEL[provider]} connection
      </p>
      <TokenTutorial provider={provider} />
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-[11px] text-slate-500" htmlFor={`conn-${f.key}`}>
            {f.label}
          </label>
          {f.type === 'select' ? (
            <select
              id={`conn-${f.key}`}
              aria-label={f.label}
              className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200"
              value={values[f.key] ?? f.options?.[0]?.value ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`conn-${f.key}`}
              aria-label={f.label}
              type={f.type === 'password' ? 'password' : 'text'}
              placeholder={f.placeholder}
              className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200"
              value={values[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white disabled:opacity-50"
          disabled={!complete || busy}
          onClick={submit}
        >
          {busy ? 'Working…' : 'Create & test'}
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-md border border-slate-200 text-slate-600"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
