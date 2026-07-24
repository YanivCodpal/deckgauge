'use client';

import { useEffect, useState } from 'react';
import type { TimesheetGridResponse, CapexReportResponse } from '@deckgauge/shared';
import { fetchTimesheetGrid, fetchCapexReport } from '../../actions/timesheet';
import { resolveWindow } from '../../timesheet/lib/timesheet-ui';
import { TimesheetView } from '../../timesheet/components/TimesheetView';
import { ReportView } from '../../timesheet/components/ReportView';

interface OrgTimesheetTabProps {
  treeId: string;
  treeName: string;
  variant: 'grid' | 'report';
}

/**
 * Embeds the timesheet grid or CapEx report as a tab on the org tree page,
 * scoped to a single tree. The heavy initial fetch runs on mount (i.e. only
 * when the tab is opened, since OrgTabs mounts panels lazily), mirroring the
 * self-loading pattern used by the board views.
 */
export function OrgTimesheetTab({ treeId, treeName, variant }: OrgTimesheetTabProps) {
  const [anchorIso] = useState(() => new Date().toISOString());
  const [grid, setGrid] = useState<TimesheetGridResponse | null>(null);
  const [report, setReport] = useState<CapexReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const w = resolveWindow(anchorIso, 'month');
    setLoading(true);
    const request =
      variant === 'grid'
        ? fetchTimesheetGrid({
            orgTreeId: treeId,
            from: w.from,
            to: w.to,
            granularity: w.granularity,
            mode: 'normalized',
          }).then((res) => {
            if (!cancelled) setGrid(res);
          })
        : fetchCapexReport({
            orgTreeId: treeId,
            from: w.from,
            to: w.to,
            granularity: w.granularity,
            mode: 'normalized',
          }).then((res) => {
            if (!cancelled) setReport(res);
          });
    request.finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [treeId, variant, anchorIso]);

  if (loading) {
    return <div className="py-8 text-center text-gray-400">Loading timesheet…</div>;
  }

  const orgTrees = [{ id: treeId, name: treeName }];

  return variant === 'grid' ? (
    <TimesheetView
      orgTrees={orgTrees}
      initialData={grid}
      initialOrgTreeId={treeId}
      anchorIso={anchorIso}
      hideTreePicker
    />
  ) : (
    <ReportView
      orgTrees={orgTrees}
      initialReport={report}
      initialOrgTreeId={treeId}
      anchorIso={anchorIso}
      hideTreePicker
    />
  );
}
