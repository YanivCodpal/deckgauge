'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_DAILY_CAP_HOURS } from '@deckgauge/shared';
import { saveOrgTreeTimesheetConfig } from '../../actions/org-tree-timesheet';

interface ActiveStatusPickerProps {
  orgTreeId: string;
  pool: string[];
  initialSelected: string[];
  /** null = unconfigured (engine default 8h); 0 = uncapped. */
  initialDailyCapHours?: number | null;
}

export function ActiveStatusPicker({
  orgTreeId,
  pool,
  initialSelected,
  initialDailyCapHours = null,
}: ActiveStatusPickerProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [filter, setFilter] = useState('');
  const [capInput, setCapInput] = useState<string>(
    initialDailyCapHours == null ? '' : String(initialDailyCapHours),
  );
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return pool.filter((s) => !selected.includes(s) && (q === '' || s.toLowerCase().includes(q)));
  }, [pool, selected, filter]);

  function add(status: string) {
    setSelected((prev) => (prev.includes(status) ? prev : [...prev, status]));
    setFilter('');
  }

  function remove(status: string) {
    setSelected((prev) => prev.filter((s) => s !== status));
  }

  async function onSave() {
    const trimmed = capInput.trim();
    const dailyCapHours = trimmed === '' ? null : Number(trimmed);
    setSaving(true);
    try {
      await saveOrgTreeTimesheetConfig(orgTreeId, selected, dailyCapHours);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400">No active statuses selected.</span>
        ) : (
          selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700"
            >
              {s}
              <button
                type="button"
                aria-label={`Remove ${s}`}
                onClick={() => remove(s)}
                className="text-indigo-400 hover:text-indigo-700"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div>
        <input
          aria-label="Filter statuses"
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          placeholder="Add a status…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter.trim() !== '' && (
          <ul className="mt-1 max-h-48 overflow-auto rounded border border-slate-200">
            {candidates.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matching statuses</li>
            ) : (
              candidates.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => add(s)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {s}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Saving an empty list counts no time for this tree. Leaving a tree unconfigured keeps the
        default (any status that isn&apos;t a To&nbsp;Do / Done state counts).
      </p>

      <div className="flex flex-col gap-1 border-t border-slate-100 pt-4">
        <label htmlFor="daily-cap-hours" className="text-sm font-medium text-slate-700">
          Daily hours cap
        </label>
        <input
          id="daily-cap-hours"
          type="number"
          min={0}
          max={24}
          step="0.5"
          aria-label="Daily hours cap"
          className="w-32 rounded border border-slate-200 px-3 py-2 text-sm"
          placeholder={String(DEFAULT_DAILY_CAP_HOURS)}
          value={capInput}
          onChange={(e) => setCapInput(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Caps each engineer&apos;s counted time per day so tickets left in progress overnight
          can&apos;t inflate a day past capacity. Blank = default&nbsp;{DEFAULT_DAILY_CAP_HOURS}h;
          0 = uncapped.
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="self-start rounded bg-indigo-500 px-4 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
