import { notFound } from 'next/navigation';
import { getOrgTree } from '@/app/actions/org-trees';
import { listEmployeeBoards } from '@/app/actions/employee-boards';
import { OrgTreeToolbar } from './OrgTreeToolbar';
import { OrgTabs } from './OrgTabs';
import { OrgTreeHeaderActions } from './OrgTreeHeaderActions';

interface OrgTreePageProps {
  params: { orgTreeId: string };
}

export default async function OrgTreePage({ params }: OrgTreePageProps) {
  const tree = await getOrgTree(params.orgTreeId);
  if (!tree) notFound();

  const boards = await listEmployeeBoards(tree.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">{tree.name}</h1>
        <OrgTreeHeaderActions treeId={tree.id} treeName={tree.name} />
      </div>
      <OrgTreeToolbar treeId={tree.id} lastSyncedAt={tree.lastSyncedAt} />
      <OrgTabs tree={tree} boards={boards} />
    </main>
  );
}
