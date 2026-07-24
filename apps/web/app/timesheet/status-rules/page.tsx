import { listOrgTrees, getOrgTree } from '../../actions/org-trees';
import { fetchStatusRules } from '../../actions/timesheet';
import { StatusRulesEditor } from '../components/StatusRulesEditor';

export default async function StatusRulesPage() {
  const trees = await listOrgTrees();
  const tree = trees[0] ? await getOrgTree(trees[0].id) : null;
  const employees = (tree?.employees ?? []).map((e) => ({ id: e.id, name: e.name, role: e.role ?? null }));
  const roles = [...new Set(employees.map((e) => e.role).filter((r): r is string => Boolean(r)))].sort();
  const rules = await fetchStatusRules();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Timesheet — In-Progress Status Rules</h1>
      <p className="mb-4 text-sm text-slate-500">
        Define which statuses count as "in progress" per role, with per-person overrides. Anyone without a matching rule
        falls back to statuses in the "In Progress" category.
      </p>
      <StatusRulesEditor initialRules={rules} roles={roles} employees={employees} />
    </main>
  );
}
