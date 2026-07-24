import type { GraphUser } from '@deckgauge/shared';

export const GRAPH_SELECT =
  'id,displayName,jobTitle,mail,userPrincipalName,officeLocation,mobilePhone,businessPhones,employeeId,employeeType,department,accountEnabled';

export interface GraphDirectoryClient {
  getUserByUpn(upn: string): Promise<GraphUser | null>;
  getDirectReports(graphId: string): Promise<GraphUser[]>;
}

const GRAPH = 'https://graph.microsoft.com/v1.0';

/** Thrown when Graph auth fails — a delegated refresh-token exchange error, or a
 *  401/403 on a directory read (expired pasted token / missing scope). `invalidGrant`
 *  marks the expired/revoked case so the caller prompts a fresh token/reconnect
 *  rather than treating it as a transient error. `forbidden` marks a 403 (the token
 *  authenticates but lacks the required scope) so the caller can prompt for the
 *  missing consent instead of a token refresh. */
export class GraphAuthError extends Error {
  readonly forbidden: boolean;

  constructor(
    message: string,
    readonly invalidGrant: boolean,
    forbidden = false,
  ) {
    super(message);
    this.name = 'GraphAuthError';
    this.forbidden = forbidden;
  }
}

/**
 * Shared Microsoft Graph REST calls (directory reads + paginated directReports +
 * 429 handling). Subclasses only supply how an access token is acquired, so the
 * app-only and delegated clients don't duplicate the REST/paging logic.
 */
abstract class GraphRestClient implements GraphDirectoryClient {
  protected readonly fetchImpl: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  /** Returns a valid Graph access token (implementations cache/refresh as needed). */
  protected abstract getToken(): Promise<string>;

  private async graphGet(url: string): Promise<Response> {
    const token = await this.getToken();
    const res = await this.fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') ?? '2');
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 30) * 1000));
      return this.fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    }
    return res;
  }

  async getUserByUpn(upn: string): Promise<GraphUser | null> {
    const res = await this.graphGet(
      `${GRAPH}/users/${encodeURIComponent(upn)}?$select=${GRAPH_SELECT}`,
    );
    if (res.status === 404) return null;
    // 401/403 = the token expired or lacks the scope → surface as a reconnect prompt,
    // not a generic failure (a pasted token expires ~1h; the UI clears it and asks
    // for a fresh one).
    if (res.status === 401 || res.status === 403) {
      throw new GraphAuthError(`Graph getUserByUpn unauthorized: ${res.status}`, true);
    }
    if (!res.ok) throw new Error(`Graph getUserByUpn failed: ${res.status}`);
    return (await res.json()) as GraphUser;
  }

  async getDirectReports(graphId: string): Promise<GraphUser[]> {
    const out: GraphUser[] = [];
    let url: string | null =
      `${GRAPH}/users/${encodeURIComponent(graphId)}/directReports?$select=${GRAPH_SELECT}`;
    while (url) {
      const res = await this.graphGet(url);
      if (res.status === 401 || res.status === 403) {
        throw new GraphAuthError(`Graph getDirectReports unauthorized: ${res.status}`, true);
      }
      if (!res.ok) throw new Error(`Graph getDirectReports failed: ${res.status}`);
      const page = (await res.json()) as { value: GraphUser[]; '@odata.nextLink'?: string };
      out.push(...page.value);
      url = page['@odata.nextLink'] ?? null;
    }
    return out;
  }
}

/**
 * Uses a user-pasted Microsoft Graph access token directly (no token exchange, no
 * app registration). The token is short-lived (~1h); when it expires the base class
 * turns the 401 into a GraphAuthError so the caller can prompt for a fresh paste.
 */
export class StaticTokenGraphDirectoryClient extends GraphRestClient {
  constructor(
    private readonly accessToken: string,
    fetchImpl?: typeof fetch,
  ) {
    super(fetchImpl);
  }

  protected async getToken(): Promise<string> {
    return this.accessToken;
  }
}

interface RealCfg {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

/** App-only (client-credentials) directory client. Kept for the app-secret path
 *  and existing tests. */
export class RealGraphDirectoryClient extends GraphRestClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly cfg: RealCfg) {
    super(cfg.fetchImpl);
  }

  protected async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });
    const res = await this.fetchImpl(
      `https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`,
      { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body },
    );
    if (!res.ok) throw new Error(`Graph token request failed: ${res.status}`);
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error('Graph token response missing access_token');
    const expiresIn = typeof json.expires_in === 'number' && Number.isFinite(json.expires_in) ? json.expires_in : 300;
    const marginMs = Math.max(0, expiresIn - 60) * 1000;
    this.token = json.access_token;
    // If marginMs is 0 the token should be treated as already expired so we set
    // tokenExpiresAt one millisecond in the past to guarantee the next call re-fetches.
    this.tokenExpiresAt = marginMs > 0 ? Date.now() + marginMs : Date.now() - 1;
    return this.token;
  }
}

interface DelegatedCfg {
  tenantId: string;
  clientId: string;
  /** Omit for a public client (device-code flow) — the refresh grant then carries no secret. */
  clientSecret?: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}

/**
 * Per-user delegated directory client. Exchanges a stored offline refresh token
 * for a Graph access token (once, lazily) and reads the directory on the
 * connecting user's behalf. Azure rotates refresh tokens, so the new one is
 * captured in `rotatedRefreshToken` for the caller to persist.
 */
export class DelegatedGraphDirectoryClient extends GraphRestClient {
  private accessToken: string | null = null;
  private currentRefreshToken: string;
  private rotated: string | null = null;

  constructor(private readonly cfg: DelegatedCfg) {
    super(cfg.fetchImpl);
    this.currentRefreshToken = cfg.refreshToken;
  }

  /** The rotated refresh token from the last exchange, or null if unchanged. */
  get rotatedRefreshToken(): string | null {
    return this.rotated;
  }

  protected async getToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.cfg.clientId,
      refresh_token: this.currentRefreshToken,
      scope: 'https://graph.microsoft.com/User.Read.All offline_access',
    });
    // Confidential clients send a secret; public clients (device-code) must not.
    if (this.cfg.clientSecret) body.set('client_secret', this.cfg.clientSecret);
    const res = await this.fetchImpl(
      `https://login.microsoftonline.com/${this.cfg.tenantId}/oauth2/v2.0/token`,
      { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const invalidGrant = res.status === 400 && text.includes('invalid_grant');
      throw new GraphAuthError(`Graph refresh_token exchange failed: ${res.status}`, invalidGrant);
    }
    const json = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!json.access_token) throw new GraphAuthError('Graph token response missing access_token', false);
    this.accessToken = json.access_token;
    if (json.refresh_token && json.refresh_token !== this.currentRefreshToken) {
      this.currentRefreshToken = json.refresh_token;
      this.rotated = json.refresh_token;
    }
    return this.accessToken;
  }
}

export class FakeGraphDirectoryClient implements GraphDirectoryClient {
  constructor(
    private readonly users: GraphUser[],
    private readonly reports: Record<string, string[]>,
  ) {}

  async getUserByUpn(upn: string): Promise<GraphUser | null> {
    return this.users.find((u) => u.userPrincipalName === upn || u.mail === upn) ?? null;
  }

  async getDirectReports(graphId: string): Promise<GraphUser[]> {
    const ids = this.reports[graphId] ?? [];
    return ids
      .map((id) => this.users.find((u) => u.id === id))
      .filter((u): u is GraphUser => Boolean(u));
  }
}
