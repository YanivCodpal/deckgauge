import type { PrismaClient } from '@deckgauge/db';
import type {
  CreateGitHubInstanceInput,
  GitHubInstance,
  GitHubProjectsPort,
} from '@deckgauge/shared';
import { normalizeRepoFullName, GitHubProjectsGraphQLAdapter } from '@deckgauge/shared';

type FetchFn = typeof fetch;

type AdapterConfig = { accessToken: string; baseUrl: string };
type ProjectsAdapterFactory = (cfg: AdapterConfig) => GitHubProjectsPort;

export type GitHubInstancePublic = Omit<GitHubInstance, 'accessToken'> & { accessToken: '***' };

function mask(instance: GitHubInstance): GitHubInstancePublic {
  return { ...instance, accessToken: '***' as const };
}

export class GitHubService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly _githubAdapterFactory?: unknown,
    private readonly projectsAdapterFactory: ProjectsAdapterFactory = (cfg) =>
      new GitHubProjectsGraphQLAdapter(cfg),
  ) {}

  async listInstances(): Promise<GitHubInstancePublic[]> {
    const rows = await this.prisma.gitHubInstance.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => mask(r as GitHubInstance));
  }

  async createInstance(input: CreateGitHubInstanceInput): Promise<GitHubInstancePublic> {
    const row = await this.prisma.gitHubInstance.create({
      data: {
        baseUrl: input.baseUrl,
        accessToken: input.accessToken,
        repos: (input.repos ?? []).map(normalizeRepoFullName),
      },
    });
    return mask(row as GitHubInstance);
  }

  async updateInstanceRepos(id: string, repos: string[]): Promise<GitHubInstancePublic | null> {
    const existing = await this.prisma.gitHubInstance.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.gitHubInstance.update({
      where: { id },
      data: { repos: repos.map(normalizeRepoFullName) },
    });
    return mask(row as GitHubInstance);
  }

  /**
   * Replace an instance's access token (and optionally its base URL). Used to
   * recover from an expired/revoked PAT without recreating the connection.
   */
  async updateInstanceToken(
    id: string,
    data: { accessToken: string; baseUrl?: string },
  ): Promise<GitHubInstancePublic | null> {
    const existing = await this.prisma.gitHubInstance.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.gitHubInstance.update({
      where: { id },
      data: {
        accessToken: data.accessToken,
        ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl } : {}),
      },
    });
    return mask(row as GitHubInstance);
  }

  async deleteInstance(id: string): Promise<boolean> {
    const existing = await this.prisma.gitHubInstance.findUnique({ where: { id } });
    if (!existing) return false;
    await this.prisma.gitHubInstance.delete({ where: { id } });
    return true;
  }

  async getRawInstanceById(id: string): Promise<GitHubInstance | null> {
    const row = await this.prisma.gitHubInstance.findUnique({ where: { id } });
    return row ? (row as GitHubInstance) : null;
  }

  async testConnection(
    instanceId: string,
    fetchFn: FetchFn = fetch,
  ): Promise<{ ok: boolean; error?: string }> {
    const instance = await this.getRawInstanceById(instanceId);
    if (!instance) return { ok: false, error: 'Instance not found' };

    const baseUrl = instance.baseUrl.replace(/\/+$/, '');
    try {
      const res = await fetchFn(`${baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${instance.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `GitHub returned ${res.status}: ${text}` };
      }
      return { ok: true };
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (err instanceof Error) {
        message = err.message;
        const cause = (err as Error & { cause?: Error }).cause;
        if (cause) message += ` — ${cause.message}`;
      }
      return { ok: false, error: message };
    }
  }

  async discoverRepos(instanceId: string, fetchFn: FetchFn = fetch): Promise<string[] | null> {
    const instance = await this.getRawInstanceById(instanceId);
    if (!instance) return null;

    const baseUrl = instance.baseUrl.replace(/\/+$/, '');
    const repos: string[] = [];
    let page = 1;

    while (true) {
      const res = await fetchFn(
        `${baseUrl}/user/repos?type=all&per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${instance.accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const data = (await res.json()) as Array<{ full_name: string }>;
      repos.push(...data.map((r) => r.full_name));

      if (data.length < 100) break;
      page++;
    }

    return repos;
  }

  async getLastSyncRun() {
    return this.prisma.syncRun.findFirst({
      where: { source: 'github' },
      orderBy: { startedAt: 'desc' },
    });
  }

  async listProjectsForInstance(instanceId: string) {
    const instance = await this.prisma.gitHubInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new Error(`GitHub instance ${instanceId} not found`);
    const adapter = this.projectsAdapterFactory({
      accessToken: instance.accessToken,
      baseUrl: instance.baseUrl,
    });
    return adapter.listAccessibleProjects();
  }
}
