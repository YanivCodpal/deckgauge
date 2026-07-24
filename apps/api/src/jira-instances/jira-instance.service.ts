import type { PrismaClient } from "@deckgauge/db";
import type {
  JiraInstancePublic,
  CreateJiraInstanceInput,
  UpdateJiraInstanceInput,
  JiraInstance,
} from "@deckgauge/shared";

function mask(instance: JiraInstance): JiraInstancePublic {
  return { ...instance, apiToken: "***" as const };
}

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
}
