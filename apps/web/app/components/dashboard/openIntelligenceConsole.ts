// Navigates from a widget element click to the board-scoped intelligence
// console with the widget's SQL pre-loaded and filtered.
//
// `config` is serialized to base64url-encoded JSON to match the decoder in
// apps/api/src/intelligence-query/routes.ts which expects `Buffer.from(b64,
// 'base64url')`. We carry `period`/`from`/`to` through from the current
// search so the period picker selection follows the user into the console.

export interface DrillContext {
  widgetType: string;
  config: Record<string, unknown>;
  // Optional: aggregate-style drills (e.g. clicking a weekly TrendLine point)
  // open the console with the widget SQL but no column-level filter.
  filter?: { dimension: string; value: string };
}

interface NavRouter {
  push: (url: string) => void;
}

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const PERIOD_PARAMS = ['period', 'from', 'to'] as const;

export function openIntelligenceConsole(
  router: NavRouter,
  boardId: string,
  ctx: DrillContext,
  currentSearch: string
): void {
  const params = new URLSearchParams();
  params.set('widget', ctx.widgetType);
  params.set('config', toBase64Url(JSON.stringify(ctx.config)));
  if (ctx.filter) {
    params.set('filter', `${ctx.filter.dimension}:${ctx.filter.value}`);
  }

  const incoming = new URLSearchParams(currentSearch);
  for (const k of PERIOD_PARAMS) {
    const v = incoming.get(k);
    if (v) params.set(k, v);
  }

  router.push(`/boards/${boardId}/intelligence?${params.toString()}`);
}
