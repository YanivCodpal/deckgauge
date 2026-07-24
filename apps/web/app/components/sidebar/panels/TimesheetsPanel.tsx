'use client';

import Link from 'next/link';
import { PanelEmptyState } from './PanelEmptyState';

interface OrgTreeItem {
  id: string;
  name: string;
}

interface TimesheetsPanelProps {
  orgTrees: OrgTreeItem[];
  /** org tree currently open in the timesheet grid, for highlight. */
  activeOrgTreeId: string | null;
  onNavigate: () => void;
}

export function TimesheetsPanel({ orgTrees, activeOrgTreeId, onNavigate }: TimesheetsPanelProps) {
  if (orgTrees.length === 0) {
    return (
      <PanelEmptyState message="Timesheets are scoped per org tree. Create an org tree first to see it here." />
    );
  }

  return (
    <>
      <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        By org tree
      </p>
      {orgTrees.map((ot) => {
        const active = ot.id === activeOrgTreeId;
        return (
          <Link
            key={ot.id}
            href={`/org/${ot.id}?tab=timesheet`}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
              active
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 font-medium text-white shadow-sm'
                : 'text-slate-700 hover:bg-white hover:shadow-sm'
            }`}
          >
            <span className="text-base" aria-hidden="true">
              🕒
            </span>
            <span className="truncate">{ot.name}</span>
          </Link>
        );
      })}
    </>
  );
}
