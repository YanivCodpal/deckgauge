'use client';

import type { ComparisonSummary } from '../../actions/comparison';
import ComparisonCanvas from './ComparisonCanvas';

interface ComparisonPageContentProps {
  comparison: ComparisonSummary;
  canEdit: boolean;
}

// Standalone comparison page body. Rename/delete live in the sidebar
// ComparisonsPanel (mirroring roadmaps), so the header here just names it.
export default function ComparisonPageContent({
  comparison,
  canEdit,
}: ComparisonPageContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{comparison.name}</h1>
      </div>
      <ComparisonCanvas comparisonId={comparison.id} canEdit={canEdit} />
    </div>
  );
}
