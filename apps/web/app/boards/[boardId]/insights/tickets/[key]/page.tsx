// P1 — Board-scoped unified ticket timeline.
import { authFetch } from '../../../../../actions/api';

interface TimelineEvent {
  source: string;
  ts: string;
  title: string;
  actor: string | null;
  ref: string;
}

async function fetchTimeline(
  boardId: string,
  key: string,
): Promise<{ events: TimelineEvent[]; notFound: boolean }> {
  try {
    const resp = await authFetch(
      `/insights/tickets/${encodeURIComponent(key)}?boardId=${encodeURIComponent(boardId)}`,
      { cache: 'no-store' },
    );
    if (resp.status === 404) return { events: [], notFound: true };
    if (!resp.ok) return { events: [], notFound: false };
    return { events: (await resp.json()) as TimelineEvent[], notFound: false };
  } catch {
    return { events: [], notFound: false };
  }
}

const SOURCE_TONE: Record<string, string> = {
  jira: 'bg-blue-50 text-blue-700 ring-blue-200',
  github: 'bg-purple-50 text-purple-700 ring-purple-200',
  'github-commit': 'bg-purple-50 text-purple-700 ring-purple-200',
  gitlab: 'bg-orange-50 text-orange-700 ring-orange-200',
  ado: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export default async function BoardTicketTimelinePage({
  params,
}: {
  params: Promise<{ boardId: string; key: string }>;
}) {
  const { boardId, key } = await params;
  const { events, notFound } = await fetchTimeline(boardId, key);

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
        <a
          href={`/?boardId=${boardId}`}
          className="text-xs text-indigo-600 hover:underline"
        >
          ← Back to board
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{key}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Unified timeline scoped to this board&apos;s connected sources.
        </p>
      </header>
      {events.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No activity for <code className="font-mono">{key}</code> in this board&apos;s sources.
          If no sources are connected, add them in{' '}
          <a href="/settings" className="underline">Settings</a>.
        </div>
      ) : (
        <ol className="relative border-l-2 border-slate-200 pl-6">
          {events.map((e, i) => (
            <li key={`${e.source}-${e.ref}-${i}`} className="mb-6 last:mb-0">
              <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-indigo-500" />
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                    SOURCE_TONE[e.source] ?? 'bg-slate-50 text-slate-600 ring-slate-200'
                  }`}
                >
                  {e.source}
                </span>
                <time className="text-xs text-slate-500" dateTime={e.ts}>
                  {e.ts}
                </time>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">{e.title}</div>
              {e.actor ? <div className="mt-0.5 text-xs text-slate-500">by {e.actor}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
