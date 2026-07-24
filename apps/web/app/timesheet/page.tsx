import { listOrgTrees } from '../actions/org-trees';
import { fetchTimesheetGrid } from '../actions/timesheet';
import { resolveWindow } from './lib/timesheet-ui';
import { TimesheetView } from './components/TimesheetView';
import { TimesheetTabs } from './components/TimesheetTabs';

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams?: { orgTreeId?: string };
}) {
  const trees = await listOrgTrees();
  const orgTrees = trees.map((t) => ({ id: t.id, name: t.name }));
  // Honor ?orgTreeId= from the sidebar Timesheets panel when it names a real
  // tree; otherwise fall back to the first tree (previous default behavior).
  const requestedId = searchParams?.orgTreeId;
  const initialOrgTreeId =
    (requestedId && orgTrees.some((t) => t.id === requestedId) ? requestedId : orgTrees[0]?.id) ?? '';
  const anchorIso = new Date().toISOString();
  const w = resolveWindow(anchorIso, 'month');
  const initialData = initialOrgTreeId
    ? await fetchTimesheetGrid({
        orgTreeId: initialOrgTreeId,
        from: w.from,
        to: w.to,
        granularity: w.granularity,
        mode: 'normalized',
      })
    : {
        from: w.from,
        to: w.to,
        granularity: w.granularity,
        mode: 'normalized' as const,
        buckets: [],
        employees: [],
        unmatched: [],
      };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Timesheet</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          CapEx / OpEx time allocation across the org, by engineer and period.
        </p>
      </header>
      <TimesheetTabs />
      {orgTrees.length === 0 ? (
        <p className="text-sm text-slate-500">
          No org tree found. Import one under Org Trees to populate the timesheet.
        </p>
      ) : (
        <TimesheetView
          orgTrees={orgTrees}
          initialData={initialData}
          initialOrgTreeId={initialOrgTreeId}
          anchorIso={anchorIso}
        />
      )}
    </main>
  );
}
