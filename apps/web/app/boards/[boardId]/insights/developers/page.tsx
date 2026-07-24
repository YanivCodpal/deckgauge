// P1 — Board-scoped developers (AI breakdown) page.
import { DeveloperRow } from '../../../../components/intelligence/charts';
import { authFetch } from '../../../../actions/api';

interface AiRow {
  author_login: string;
  ai_prs: number;
  total_prs: number;
  ai_pct: number;
}

async function fetchAi(boardId: string): Promise<{ rows: AiRow[]; notFound: boolean }> {
  try {
    const resp = await authFetch(
      `/insights/ai-breakdown?boardId=${encodeURIComponent(boardId)}`,
      { cache: 'no-store' },
    );
    if (resp.status === 404) return { rows: [], notFound: true };
    if (!resp.ok) return { rows: [], notFound: false };
    return { rows: (await resp.json()) as AiRow[], notFound: false };
  } catch {
    return { rows: [], notFound: false };
  }
}

export default async function BoardDevelopersPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const { rows, notFound } = await fetchAi(boardId);

  if (notFound) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Board not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <a href={`/?boardId=${boardId}`} className="text-xs text-indigo-600 hover:underline">
          ← Back to board
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Developers</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ranked by AI-assisted PR percentage for this board&apos;s sources, last 30 days.
        </p>
      </header>
      {rows.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No intelligence sources connected — open{' '}
          <a href="/settings" className="underline">Settings</a> to add Jira/GitHub/ADO/GitLab
          connections for this board.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          {rows.map((r) => (
            <DeveloperRow
              key={r.author_login}
              login={r.author_login}
              prsMerged={r.ai_prs}
              aiPct={r.ai_pct}
              medianCycleHours={null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
