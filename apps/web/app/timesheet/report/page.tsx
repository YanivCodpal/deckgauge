import { listOrgTrees } from '../../actions/org-trees';
import { fetchCapexReport } from '../../actions/timesheet';
import { resolveWindow } from '../lib/timesheet-ui';
import { ReportView } from '../components/ReportView';
import { TimesheetTabs } from '../components/TimesheetTabs';

export default async function TimesheetReportPage() {
  const trees = await listOrgTrees();
  const orgTrees = trees.map((t) => ({ id: t.id, name: t.name }));
  const initialOrgTreeId = orgTrees[0]?.id ?? '';
  const anchorIso = new Date().toISOString();
  const w = resolveWindow(anchorIso, 'month');
  const initialReport = initialOrgTreeId
    ? await fetchCapexReport({
        orgTreeId: initialOrgTreeId,
        from: w.from,
        to: w.to,
        granularity: w.granularity,
        mode: 'normalized',
      })
    : null;

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
          No org tree found. Import one under Org Trees to populate the report.
        </p>
      ) : (
        <ReportView
          orgTrees={orgTrees}
          initialReport={initialReport}
          initialOrgTreeId={initialOrgTreeId}
          anchorIso={anchorIso}
        />
      )}
    </main>
  );
}
