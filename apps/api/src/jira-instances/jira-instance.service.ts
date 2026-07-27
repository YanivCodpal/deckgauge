import type { PrismaClient } from "@deckgauge/db";
import type {
  JiraInstancePublic,
  CreateJiraInstanceInput,
  UpdateJiraInstanceInput,
  JiraInstance,
} from "@deckgauge/shared";
import { Agent } from "undici";

// Some corporate Jira instances sit behind self-signed/lenient TLS. Scope the
// leniency to this single request via an undici dispatcher — never mutate
// process.env.NODE_TLS_REJECT_UNAUTHORIZED, which would disable certificate
// validation process-wide for every other in-flight fetch (GitHub/GitLab/ADO
// health probes now run concurrently alongside this one via Promise.all).
const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

function mask(instance: JiraInstance): JiraInstancePublic {
  return { ...instance, apiToken: "***" as const };
}

type FetchFn = typeof fetch;
type RefreshResult = { ok: boolean; error?: string; notFound?: boolean };

export class JiraInstanceService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<JiraInstancePublic[]> {
    const rows = await this.prisma.jiraInstance.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => mask(r as JiraInstance));
  }

  async getById(id: string): Promise<JiraInstancePublic | null> {
    const row = await this.prisma.jiraInstance.findUnique({ where: { id } });
    if (!row) return null;
    return mask(row as JiraInstance);
  }

  async getRawById(id: string): Promise<JiraInstance | null> {
    const row = await this.prisma.jiraInstance.findUnique({ where: { id } });
    if (!row) return null;
    return row as JiraInstance;
  }

  async create(input: CreateJiraInstanceInput): Promise<JiraInstancePublic> {
    const row = await this.prisma.jiraInstance.create({
      data: {
        name: input.name,
        atlassianUrl: input.atlassianUrl,
        email: input.email,
        apiToken: input.apiToken,
        projectKeys: input.projectKeys,
      },
    });
    return mask(row as JiraInstance);
  }

  async update(
    id: string,
    input: UpdateJiraInstanceInput,
  ): Promise<JiraInstancePublic | null> {
    const existing = await this.prisma.jiraInstance.findUnique({
      where: { id },
    });
    if (!existing) return null;

    const row = await this.prisma.jiraInstance.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.atlassianUrl !== undefined && {
          atlassianUrl: input.atlassianUrl,
        }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.apiToken !== undefined && { apiToken: input.apiToken }),
        ...(input.projectKeys !== undefined && {
          projectKeys: input.projectKeys,
        }),
      },
    });
    return mask(row as JiraInstance);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.jiraInstance.findUnique({
      where: { id },
    });
    if (!existing) return false;

    await this.prisma.jiraInstance.delete({ where: { id } });
    return true;
  }

  private async probeToken(
    params: { atlassianUrl: string; email: string; token: string },
    fetchFn: FetchFn = fetch,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const encoded = Buffer.from(`${params.email}:${params.token}`).toString(
        "base64",
      );
      const baseUrl = params.atlassianUrl.replace(/\/+$/, "");
      const res = await fetchFn(`${baseUrl}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${encoded}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        // Scoped per-request TLS leniency (self-signed/corporate certs on
        // some Jira instances) — see `insecureDispatcher` above. Only the
        // real global `fetch` honors `dispatcher`; injected test fetches
        // ignore the extra init field.
        dispatcher: insecureDispatcher,
      } as RequestInit & { dispatcher: Agent });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `Jira returned ${res.status}: ${text}` };
      }
      return { ok: true };
    } catch (err: unknown) {
      let message = "Unknown error";
      if (err instanceof Error) {
        message = err.message;
        const cause = (err as Error & { cause?: Error }).cause;
        if (cause) message += ` — ${cause.message}`;
      }
      return { ok: false, error: message };
    }
  }

  async testConnection(
    id: string,
    fetchFn: FetchFn = fetch,
  ): Promise<{ ok: boolean; error?: string }> {
    const instance = await this.getRawById(id);
    if (!instance) return { ok: false, error: "Instance not found" };
    return this.probeToken(
      { atlassianUrl: instance.atlassianUrl, email: instance.email, token: instance.apiToken },
      fetchFn,
    );
  }

  async refreshToken(
    id: string,
    newToken: string,
    fetchFn: FetchFn = fetch,
  ): Promise<RefreshResult> {
    const instance = await this.getRawById(id);
    if (!instance) return { ok: false, notFound: true, error: "Instance not found" };
    const probe = await this.probeToken(
      { atlassianUrl: instance.atlassianUrl, email: instance.email, token: newToken },
      fetchFn,
    );
    if (!probe.ok) return probe;
    const updated = await this.update(id, { apiToken: newToken });
    if (!updated) return { ok: false, notFound: true, error: "Instance not found" };
    return { ok: true };
  }
}
