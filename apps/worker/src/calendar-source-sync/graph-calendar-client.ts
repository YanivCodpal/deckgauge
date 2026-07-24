import { GraphAuthError } from '../org-source-sync/graph-directory-client.js';

/** A single interview-relevant calendar event, flattened from the Graph payload. */
export interface CalendarEvent {
  id: string;
  subject: string;
  startIso: string;
  isCancelled: boolean;
}

/** Reads a user's calendar window from Microsoft Graph. Injected so tests use a fake. */
export interface CalendarClient {
  getCalendarView(
    upn: string,
    accessToken: string,
    fromISO: string,
    toISO: string,
  ): Promise<CalendarEvent[]>;
}

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SELECT = 'id,subject,start,end,isCancelled,organizer';
const PAGE_SIZE = 50;
const MAX_RETRY_AFTER_SECONDS = 30;

interface GraphEventDto {
  id: string;
  subject: string | null;
  isCancelled?: boolean;
  start?: { dateTime?: string; timeZone?: string } | null;
}

interface GraphEventPage {
  value: GraphEventDto[];
  '@odata.nextLink'?: string;
}

/**
 * Normalize a Graph start object to an ISO-8601 UTC string. Graph returns a naive
 * datetime paired with a timeZone; with `Prefer: outlook.timezone="UTC"` that zone is
 * UTC, so append 'Z' unless the string already carries a zone/offset. Returns '' when
 * unparseable.
 */
function toStartIso(start: GraphEventDto['start']): string {
  const dt = start?.dateTime;
  if (!dt) return '';
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(dt);
  const parsed = new Date(hasZone ? dt : `${dt}Z`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

/**
 * Microsoft Graph calendarView reader. Mirrors the org-source GraphRestClient's auth /
 * 429 / paging conventions but takes the access token per call (calendar sync stores a
 * pasted token per board and passes it in). Throws a GraphAuthError on 401/403 so the
 * handler can prompt a reconnect instead of treating it as a transient failure.
 */
export class GraphCalendarClient implements CalendarClient {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async getCalendarView(
    upn: string,
    accessToken: string,
    fromISO: string,
    toISO: string,
  ): Promise<CalendarEvent[]> {
    const query =
      `startDateTime=${encodeURIComponent(fromISO)}` +
      `&endDateTime=${encodeURIComponent(toISO)}` +
      `&$select=${SELECT}` +
      `&$orderby=${encodeURIComponent('start/dateTime')}` +
      `&$top=${PAGE_SIZE}`;
    let url: string | null = `${GRAPH}/users/${encodeURIComponent(upn)}/calendarView?${query}`;

    const out: CalendarEvent[] = [];
    while (url) {
      const res = await this.graphGet(url, accessToken);
      // 401 = the token expired/was revoked (prompt a fresh paste). 403 = the token
      // authenticates but lacks the Calendars.Read scope (prompt consent, not a
      // refresh) — a default Graph Explorer token only has User.Read.
      if (res.status === 401 || res.status === 403) {
        const forbidden = res.status === 403;
        throw new GraphAuthError(
          `Graph calendarView unauthorized: ${res.status}`,
          !forbidden,
          forbidden,
        );
      }
      if (!res.ok) throw new Error(`Graph calendarView failed: ${res.status}`);
      const page = (await res.json()) as GraphEventPage;
      for (const e of page.value) {
        out.push({
          id: e.id,
          subject: e.subject ?? '',
          startIso: toStartIso(e.start),
          isCancelled: Boolean(e.isCancelled),
        });
      }
      url = page['@odata.nextLink'] ?? null;
    }
    return out;
  }

  private async graphGet(url: string, token: string): Promise<Response> {
    const headers = {
      authorization: `Bearer ${token}`,
      // Return start/end datetimes already normalized to UTC.
      prefer: 'outlook.timezone="UTC"',
    };
    const res = await this.fetchImpl(url, { headers });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '2');
      const waitMs = Math.min(Number.isFinite(retryAfter) ? retryAfter : 2, MAX_RETRY_AFTER_SECONDS) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.fetchImpl(url, { headers });
    }
    return res;
  }
}

/** In-memory calendar client for local dev (USE_FAKE_GRAPH) and tests. */
export class FakeCalendarClient implements CalendarClient {
  constructor(private readonly events: CalendarEvent[]) {}

  async getCalendarView(): Promise<CalendarEvent[]> {
    return this.events;
  }
}
