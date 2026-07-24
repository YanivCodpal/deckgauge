import type { Provider, RawTransition } from '@deckgauge/shared';

export interface ChQueryClient {
  query(params: {
    query: string;
    query_params?: Record<string, unknown>;
    format?: string;
  }): Promise<{ json(): Promise<unknown> }>;
}

interface JiraRow {
  issue_key: string;
  assignee: string | null;
  to_status: string;
  to_category: string;
  ts_s: number;
}

interface AdoRow {
  project: string;
  work_item_id: number;
  assigned_to: string | null;
  to_state: string;
  ts_s: number;
}

const JIRA_QUERY = `
  SELECT issue_key, assignee, to_status, to_category, toUnixTimestamp(transitioned_at) AS ts_s
  FROM cockpit.jira_transitions FINAL
  WHERE transitioned_at < toDateTime({to:UInt32})
`;

const ADO_QUERY = `
  SELECT project, work_item_id, assigned_to, to_state, toUnixTimestamp(changed_at) AS ts_s
  FROM cockpit.ado_transitions FINAL
  WHERE changed_at < toDateTime({to:UInt32})
`;

/** Fetch Jira + ADO transitions before the window end, mapped to RawTransition (epoch-ms). */
export async function fetchTransitions(
  client: ChQueryClient,
  toMs: number
): Promise<RawTransition[]> {
  const toSeconds = Math.floor(toMs / 1000);

  const jiraRes = await client.query({
    query: JIRA_QUERY,
    query_params: { to: toSeconds },
    format: 'JSONEachRow',
  });
  const adoRes = await client.query({
    query: ADO_QUERY,
    query_params: { to: toSeconds },
    format: 'JSONEachRow',
  });

  const jiraRows = (await jiraRes.json()) as JiraRow[];
  const adoRows = (await adoRes.json()) as AdoRow[];

  const jira: RawTransition[] = jiraRows.map((r) => ({
    issueKey: r.issue_key,
    provider: 'jira' as Provider,
    assignee: r.assignee,
    status: r.to_status,
    category: r.to_category,
    transitionedAtMs: r.ts_s * 1000,
  }));

  const ado: RawTransition[] = adoRows.map((r) => ({
    issueKey: `${r.project}#${r.work_item_id}`,
    provider: 'ado' as Provider,
    assignee: r.assigned_to,
    status: r.to_state,
    category: null,
    transitionedAtMs: r.ts_s * 1000,
  }));

  return [...jira, ...ado];
}

const JIRA_PARENT_QUERY = `
  SELECT key AS child, coalesce(nullIf(parent_key, ''), nullIf(epic_key, '')) AS parent
  FROM cockpit.jira_issues FINAL
  WHERE coalesce(nullIf(parent_key, ''), nullIf(epic_key, '')) != ''
`;

const ADO_PARENT_QUERY = `
  SELECT concat(project, '#', toString(ado_id)) AS child,
         concat(project, '#', toString(parent_ado_id)) AS parent
  FROM cockpit.ado_work_items FINAL
  WHERE parent_ado_id IS NOT NULL
`;

const CLASSIFICATION_QUERY = `
  SELECT issue_key, argMax(classification, synced_at) AS classification
  FROM cockpit.board_item_classification FINAL
  GROUP BY provider, issue_key
`;

interface ParentRow {
  child: string;
  parent: string;
}

/** child issueKey -> parent issueKey, across Jira (parent_key|epic_key) and ADO (parent_ado_id). */
export async function fetchParentLinks(client: ChQueryClient): Promise<Map<string, string>> {
  const jiraRes = await client.query({ query: JIRA_PARENT_QUERY, format: 'JSONEachRow' });
  const adoRes = await client.query({ query: ADO_PARENT_QUERY, format: 'JSONEachRow' });
  const rows = [
    ...((await jiraRes.json()) as ParentRow[]),
    ...((await adoRes.json()) as ParentRow[]),
  ];
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.child && r.parent) map.set(r.child, r.parent);
  }
  return map;
}

interface ClassRow {
  issue_key: string;
  classification: string;
}

/** issueKey -> CAPEX|OPEX from the board_item_classification mirror (latest by synced_at). */
export async function fetchClassificationMap(
  client: ChQueryClient
): Promise<Map<string, 'CAPEX' | 'OPEX'>> {
  const res = await client.query({ query: CLASSIFICATION_QUERY, format: 'JSONEachRow' });
  const rows = (await res.json()) as ClassRow[];
  const map = new Map<string, 'CAPEX' | 'OPEX'>();
  for (const r of rows) {
    if (r.classification === 'CAPEX' || r.classification === 'OPEX') {
      map.set(r.issue_key, r.classification);
    }
  }
  return map;
}

// One scan per source table yields both the human title and the source deep
// link, so the (cached) engine run doesn't pay a second full-table scan just
// for URLs. Raw base URLs are fetched and the link is assembled in TS to mirror
// the JiraKeyBadge / AdoWorkItemBadge shapes exactly (trailing-slash strip +
// encodeURIComponent on the ADO project).
const JIRA_META_QUERY = `
  SELECT key, summary, instance_url
  FROM cockpit.jira_issues FINAL
`;

const ADO_META_QUERY = `
  SELECT project, ado_id, title, org_url
  FROM cockpit.ado_work_items FINAL
`;

interface JiraMetaRow {
  key: string;
  summary: string;
  instance_url: string;
}

interface AdoMetaRow {
  project: string;
  ado_id: number;
  title: string;
  org_url: string;
}

/** An issue's human title and its source deep link (null when the base URL is unknown). */
export interface IssueMeta {
  title: string;
  url: string | null;
}

function stripTrailingSlash(base: string): string {
  return base.replace(/\/+$/, '');
}

/** issueKey -> { title, url }, across Jira (summary + /browse/) and ADO (title + /_workitems/edit/). */
export async function fetchIssueMeta(client: ChQueryClient): Promise<Map<string, IssueMeta>> {
  const jiraRes = await client.query({ query: JIRA_META_QUERY, format: 'JSONEachRow' });
  const adoRes = await client.query({ query: ADO_META_QUERY, format: 'JSONEachRow' });
  const jiraRows = (await jiraRes.json()) as JiraMetaRow[];
  const adoRows = (await adoRes.json()) as AdoMetaRow[];

  const map = new Map<string, IssueMeta>();
  for (const r of jiraRows) {
    if (!r.key) continue;
    const url = r.instance_url ? `${stripTrailingSlash(r.instance_url)}/browse/${r.key}` : null;
    map.set(r.key, { title: r.summary ?? '', url });
  }
  for (const r of adoRows) {
    const key = `${r.project}#${r.ado_id}`;
    const url = r.org_url
      ? `${stripTrailingSlash(r.org_url)}/${encodeURIComponent(r.project)}/_workitems/edit/${r.ado_id}`
      : null;
    map.set(key, { title: r.title ?? '', url });
  }
  return map;
}
