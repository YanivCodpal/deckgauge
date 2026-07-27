import type { PrismaClient } from '@deckgauge/db';
import type {
  AzureDevOpsInstance,
  CreateAzureDevOpsInstanceInput,
  UpdateAzureDevOpsInstanceInput,
} from '@deckgauge/shared';

export type AzureDevOpsInstancePublic = Omit<AzureDevOpsInstance, 'accessToken'> & {
  accessToken: '***';
};

type FetchFn = typeof fetch;
type RefreshResult = { ok: boolean; error?: string; notFound?: boolean };

function mask(instance: AzureDevOpsInstance): AzureDevOpsInstancePublic {
  return { ...instance, accessToken: '***' as const };
}

export class AzureDevOpsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listInstances(): Promise<AzureDevOpsInstancePublic[]> {
    const rows = await this.prisma.azureDevOpsInstance.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => mask(r as AzureDevOpsInstance));
  }

  async createInstance(input: CreateAzureDevOpsInstanceInput): Promise<AzureDevOpsInstancePublic> {
    const row = await this.prisma.azureDevOpsInstance.create({
      data: {
        name: input.name,
        orgUrl: input.orgUrl,
        authMethod: input.authMethod,
        accessToken: input.accessToken,
        username: input.username ?? null,
        projects: input.projects,
      },
    });
    return mask(row as AzureDevOpsInstance);
  }

  async updateInstance(
    id: string,
    input: UpdateAzureDevOpsInstanceInput,
  ): Promise<AzureDevOpsInstancePublic | null> {
    const existing = await this.prisma.azureDevOpsInstance.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.azureDevOpsInstance.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.orgUrl !== undefined && { orgUrl: input.orgUrl }),
        ...(input.authMethod !== undefined && { authMethod: input.authMethod }),
        ...(input.accessToken !== undefined && { accessToken: input.accessToken }),
        ...(input.username !== undefined && { username: input.username }),
        ...(input.projects !== undefined && { projects: input.projects }),
      },
    });
    return mask(row as AzureDevOpsInstance);
  }

  async deleteInstance(id: string): Promise<boolean> {
    const existing = await this.prisma.azureDevOpsInstance.findUnique({ where: { id } });
    if (!existing) return false;
    await this.prisma.azureDevOpsInstance.delete({ where: { id } });
    return true;
  }

  async getRawInstanceById(id: string): Promise<AzureDevOpsInstance | null> {
    const row = await this.prisma.azureDevOpsInstance.findUnique({ where: { id } });
    return row ? (row as AzureDevOpsInstance) : null;
  }

  async getLastSyncRun() {
    return this.prisma.syncRun.findFirst({
      where: { source: 'azure-devops' },
      orderBy: { startedAt: 'desc' },
    });
  }

  private async probeToken(
    params: { orgUrl: string; authMethod: string; username: string | null; token: string },
    fetchFn: FetchFn = fetch,
  ): Promise<{ ok: boolean; error?: string }> {
    const url = `${params.orgUrl.replace(/\/+$/, '')}/_apis/projects?$top=1&api-version=7.0`;
    const authHeader =
      params.authMethod === 'PAT'
        ? `Basic ${Buffer.from(`:${params.token}`).toString('base64')}`
        : `Basic ${Buffer.from(`${params.username ?? ''}:${params.token}`).toString('base64')}`;
    try {
      const res = await fetchFn(url, {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, error: `Azure DevOps returned ${res.status}` };
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  async testConnection(
    id: string,
    fetchFn: FetchFn = fetch,
  ): Promise<{ ok: boolean; error?: string }> {
    const instance = await this.getRawInstanceById(id);
    if (!instance) return { ok: false, error: 'Instance not found' };
    return this.probeToken(
      {
        orgUrl: instance.orgUrl,
        authMethod: instance.authMethod,
        username: instance.username,
        token: instance.accessToken,
      },
      fetchFn,
    );
  }

  async refreshToken(
    id: string,
    newToken: string,
    fetchFn: FetchFn = fetch,
  ): Promise<RefreshResult> {
    const instance = await this.getRawInstanceById(id);
    if (!instance) return { ok: false, notFound: true, error: 'Instance not found' };
    const probe = await this.probeToken(
      {
        orgUrl: instance.orgUrl,
        authMethod: instance.authMethod,
        username: instance.username,
        token: newToken,
      },
      fetchFn,
    );
    if (!probe.ok) return probe;
    const updated = await this.updateInstance(id, { accessToken: newToken });
    if (!updated) return { ok: false, notFound: true, error: 'Instance not found' };
    return { ok: true };
  }
}
