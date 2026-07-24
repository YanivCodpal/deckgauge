"use client";

import { useState, useTransition } from "react";
import { listOrgTrees } from "../actions/org-trees";
import { onboardCandidate } from "../actions/recruitment";

interface OnboardControlProps {
  boardId: string;
  projectId: string;
  /** When set, the candidate is already onboarded — the control shows a done state. */
  onboardedEmployeeId?: string | null;
}

/**
 * Capability-gated control (rendered only for recruitment boards) that turns a Hired
 * candidate row into an OrgEmployee in a chosen org tree. Org trees are loaded lazily
 * when the picker is opened. Errors from the server action are surfaced inline.
 */
export function OnboardControl({ boardId, projectId, onboardedEmployeeId }: OnboardControlProps) {
  const [open, setOpen] = useState(false);
  const [trees, setTrees] = useState<{ id: string; name: string }[] | null>(null);
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    onboardedEmployeeId ? { ok: true, text: "Onboarded to org tree" } : null,
  );

  const done = result?.ok === true;

  async function openPicker() {
    setOpen(true);
    if (trees) return;
    try {
      const list = await listOrgTrees();
      const mapped = list.map((t) => ({ id: t.id, name: t.name }));
      setTrees(mapped);
      if (mapped[0]) setSelected(mapped[0].id);
    } catch {
      setTrees([]);
      setResult({ ok: false, text: "Couldn't load org trees" });
    }
  }

  function submit() {
    if (!selected) return;
    startTransition(async () => {
      const res = await onboardCandidate(boardId, projectId, selected);
      setResult(res.ok ? { ok: true, text: "Onboarded to org tree" } : { ok: false, text: res.error });
      if (res.ok) setOpen(false);
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-surface-2 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Onboarding
      </div>

      {done ? (
        <p className="text-sm font-medium text-emerald-600">✓ {result?.text}</p>
      ) : !open ? (
        <button type="button" className="btn-secondary" onClick={openPicker}>
          Onboard → org tree
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-600" htmlFor="onboard-tree">
            Add to org tree
          </label>
          <select
            id="onboard-tree"
            className="select-dark"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={pending || trees === null}
          >
            {trees === null && <option>Loading…</option>}
            {trees?.length === 0 && <option value="">No org trees</option>}
            {trees?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={pending || !selected}
            >
              {pending ? "Creating…" : "Create employee"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <p className="mt-2 text-sm text-red-600">{result.text}</p>
      )}
    </section>
  );
}
