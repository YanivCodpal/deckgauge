'use client';

import type { ActivityItem, EmployeeActivity } from '../../actions/org-trees';

function ActivityTable({
  title,
  items,
  emptyText,
  titleHeader,
}: {
  title: string;
  items: ActivityItem[];
  emptyText: string;
  titleHeader: string;
}) {
  return (
    <section className="mb-5">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{titleHeader}</th>
                <th className="px-3 py-2 font-medium">Repo</th>
                <th className="px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={`${title}-${it.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {it.url ? (
                      <a href={it.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        {it.title}
                      </a>
                    ) : (
                      <span className="text-slate-700">{it.title}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{it.subtitle}</td>
                  <td className="px-3 py-2 text-slate-400">{it.timestamp.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ActivityTables({ activity }: { activity: EmployeeActivity }) {
  return (
    <div>
      <ActivityTable
        title="Pull requests"
        titleHeader="Title"
        items={activity.pullRequests}
        emptyText="No pull requests."
      />
      <ActivityTable
        title="Commits"
        titleHeader="Message"
        items={activity.commits}
        emptyText="No commits."
      />
      <ActivityTable
        title="Assigned issues"
        titleHeader="Issue"
        items={activity.assignedIssues}
        emptyText="No assigned issues."
      />
    </div>
  );
}
