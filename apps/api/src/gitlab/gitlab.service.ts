// EI-030 — GitLab service. CRUD on GitLabInstance + GitLabProjectSync.
import { PrismaClient } from '@deckgauge/db';

export interface CreateGitLabInstanceInput {
  name: string;
  baseUrl?: string;
  accessToken: string;
  projects: string[];
}

export interface CreateGitLabProjectSyncInput {
  gitlabInstanceId: string;
  projectPath: string;
  syncPrs?: boolean;
  syncCommits?: boolean;
}

export class GitLabService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async listInstances() {
    return this.prisma.gitLabInstance.findMany({
      select: {
        id: true,
        name: true,
        baseUrl: true,
        projects: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createInstance(input: CreateGitLabInstanceInput) {
    return this.prisma.gitLabInstance.create({
      data: {
        name: input.name,
        baseUrl: input.baseUrl ?? 'https://gitlab.com/api/v4',
        accessToken: input.accessToken,
        projects: input.projects,
      },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        projects: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteInstance(id: string) {
    await this.prisma.gitLabInstance.delete({ where: { id } });
  }

  async listProjectSyncs(instanceId?: string) {
    return this.prisma.gitLabProjectSync.findMany({
      where: instanceId ? { gitlabInstanceId: instanceId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
  }

  async createProjectSync(input: CreateGitLabProjectSyncInput) {
    return this.prisma.gitLabProjectSync.create({
      data: {
        gitlabInstanceId: input.gitlabInstanceId,
        projectPath: input.projectPath,
        syncPrs: input.syncPrs ?? true,
        syncCommits: input.syncCommits ?? false,
      },
    });
  }

  async deleteProjectSync(id: string) {
    await this.prisma.gitLabProjectSync.delete({ where: { id } });
  }

  async testConnection(instanceId: string): Promise<{ ok: boolean; error?: string }> {
    const instance = await this.prisma.gitLabInstance.findUnique({
      where: { id: instanceId },
      select: { baseUrl: true, accessToken: true },
    });
    if (!instance) return { ok: false, error: 'Instance not found' };
    const url = `${instance.baseUrl.replace(/\/$/, '')}/user`;
    try {
      const res = await this.fetchFn(url, { headers: { 'PRIVATE-TOKEN': instance.accessToken } });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `GitLab returned ${res.status}: ${text}` };
      }
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async listRemoteProjects(instanceId: string): Promise<string[]> {
    const instance = await this.prisma.gitLabInstance.findUnique({
      where: { id: instanceId },
      select: { baseUrl: true, accessToken: true },
    });
    if (!instance) throw new Error(`GitLab instance not found: ${instanceId}`);

    const url = `${instance.baseUrl.replace(/\/$/, '')}/projects?membership=true&simple=true&per_page=100`;
    const res = await this.fetchFn(url, {
      headers: { 'PRIVATE-TOKEN': instance.accessToken },
    });
    if (!res.ok) {
      throw new Error(`GitLab API error: ${res.status}`);
    }
    const data = (await res.json()) as Array<{ path_with_namespace: string }>;
    return data.map((p) => p.path_with_namespace);
  }
}
