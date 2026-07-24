'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { PeriodPreset } from '@deckgauge/shared';

const PRESETS: ReadonlyArray<PeriodPreset> = ['7d', '14d', '30d', '90d'];

export function BoardPeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const currentPreset = search.get('period');
  const currentFrom = search.get('from') ?? '';
  const currentTo = search.get('to') ?? '';

  const isCustomActive = Boolean(currentFrom && currentTo);

  const [customOpen, setCustomOpen] = useState(isCustomActive);
  const [fromInput, setFromInput] = useState(currentFrom);
  const [toInput, setToInput] = useState(currentTo);

  function write(next: URLSearchParams): void {
    router.replace(`${pathname}?${next.toString()}`);
  }

  function buildBase(): URLSearchParams {
    // Copy all existing params so unrelated ones are preserved.
    return new URLSearchParams(search.toString());
  }

  function selectPreset(p: PeriodPreset): void {
    const next = buildBase();
    next.delete('from');
    next.delete('to');
    next.set('period', p);
    write(next);
    setCustomOpen(false);
  }

  function clear(): void {
    const next = buildBase();
    next.delete('period');
    next.delete('from');
    next.delete('to');
    write(next);
    setCustomOpen(false);
    setFromInput('');
    setToInput('');
  }

  function commitCustom(from: string, to: string): void {
    if (!from || !to || from >= to) return;
    const next = buildBase();
    next.delete('period');
    next.set('from', from);
    next.set('to', to);
    write(next);
  }

  const hasActive = Boolean(currentPreset) || isCustomActive;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPreset(p)}
            aria-pressed={currentPreset === p}
            className={`px-2 py-1 text-sm rounded-md ${
              currentPreset === p
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-pressed={customOpen}
          className={`px-2 py-1 text-sm rounded-md ${
            customOpen
              ? 'bg-indigo-500 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <span className="inline-flex items-center gap-1">
          <input
            aria-label="from"
            type="date"
            value={fromInput}
            onInput={(e) => setFromInput((e.target as HTMLInputElement).value)}
            onChange={(e) => setFromInput(e.target.value)}
            onBlur={() => commitCustom(fromInput, toInput)}
            className="text-sm border border-slate-200 rounded-md px-1 py-1"
          />
          <span className="text-slate-400">–</span>
          <input
            aria-label="to"
            type="date"
            value={toInput}
            onInput={(e) => setToInput((e.target as HTMLInputElement).value)}
            onChange={(e) => setToInput(e.target.value)}
            onBlur={() => commitCustom(fromInput, toInput)}
            className="text-sm border border-slate-200 rounded-md px-1 py-1"
          />
        </span>
      )}

      {hasActive && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear period"
          className="text-slate-400 hover:text-slate-600 text-sm px-1"
        >
          ×
        </button>
      )}
    </div>
  );
}
