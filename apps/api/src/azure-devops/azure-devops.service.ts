import type { PrismaClient } from '@deckgauge/db';
import type {
  AzureDevOpsInstance,
  CreateAzureDevOpsInstanceInput,
  UpdateAzureDevOpsInstanceInput,
} from '@deckgauge/shared';

export type AzureDevOpsInstancePublic = Omit<AzureDevOpsInstance, 'accessToken'> & {
  accessToken: '***';
};

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
}
