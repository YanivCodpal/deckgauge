import type { PrismaClient } from '@deckgauge/db';
import {
  normalizeOrgRows,
  resolveHierarchy,
  wouldCreateCycle,
  computeRanking,
  EmployeeStatsSchema,
  type RawOrgRow,
  type ImportResult,
  type OrgTreeDto,
  type OrgEmployeeDto,
  type EmployeeRankingDto,
  type RankingInput,
  type SyncStatus,
  type UpdateEmployeeProfileInput,
} from '@deckgauge/shared';
import { toOrgEmployeeDto } from './org-employee-dto.js';

export class OrgTreeCycleError extends Error {
  constructor(message = 'move would create a cycle') {
    super(message);
    this.name = 'OrgTreeCycleError';
  }
}

export class OrgEmployeeForbiddenError extends Error {
  constructor(message = 'not permitted to edit salary') {
    super(message);
    this.name = 'OrgEmployeeForbiddenError';
  }
}

/** Minimal shape needed to rank an employee within its tree. */
interface RankableEmployee {
  id: string;
  isVacancy: boolean;
  departedAt: Date | null;
  matched: boolean;
  statsJson: unknown;
}

/**
 * Compute the tree-relative leaderboard for a set of employees. Only real, matched,
 * still-present employees with stored ranking counts take part — vacancies, departed
 * people, and unmatched rows are excluded so they neither skew the min-max
 * normalization nor inflate `totalRanked`. Returns a map keyed by employeeId; anyone
 * excluded is simply absent (the DTO layer maps that to `ranking: null`).
 */
export function computeTreeRanking(
  employees: RankableEmployee[],
): Map<string, EmployeeRankingDto> {
  const inputs: RankingInput[] = [];
  for (const e of employees) {
    if (e.isVacancy || e.departedAt != null || !e.matched) continue;
    const parsed = e.statsJson ? EmployeeStatsSchema.safeParse(e.statsJson) : null;
    if (parsed && parsed.success && parsed.data.ranking) {
      inputs.push({ employeeId: e.id, counts: parsed.data.ranking });
    }
  }
  return computeRanking(inputs);
}

export interface OrgTreeSummary {
  id: string;
  name: string;
  position: number;
  lastSyncedAt: string | null;
}

export class OrgTreeService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(name: string): Promise<{ id: string }> {
    const max = await this.prisma.orgTree.aggregate({ _max: { position: true } });
    const row = await this.prisma.orgTree.create({
      data: { name, position: (max._max.position ?? -1) + 1 },
    });
    return { id: row.id };
  }

  /** Rename a tree. Returns the updated summary, or null when the tree is gone. */
  async rename(id: string, name: string): Promise<OrgTreeSummary | null> {
    const existing = await this.prisma.orgTree.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return null;
    const row = await this.prisma.orgTree.update({ where: { id }, data: { name } });
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    };
  }

  async list(): Promise<OrgTreeSummary[]> {
    const rows = await this.prisma.orgTree.findMany({ orderBy: { position: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
    }));
  }

  async getWithEmployees(
    id: string,
    opts?: { includeSalary?: boolean },
  ): Promise<OrgTreeDto | null> {
    const tree = await this.prisma.orgTree.findUnique({
      where: { id },
      include: {
        employees: {
          include: { aliases: true },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        },
      },
    });
    if (!tree) return null;
    const rankingByEmployee = computeTreeRanking(tree.employees);
    const employees: OrgEmployeeDto[] = tree.employees.map((e) =>
      toOrgEmployeeDto(e, e.aliases, !!opts?.includeSalary, rankingByEmployee.get(e.id) ?? null),
    );
    return {
      id: tree.id,
      name: tree.name,
      position: tree.position,
      lastSyncedAt: tree.lastSyncedAt ? tree.lastSyncedAt.toISOString() : null,
      employees,
    };
  }

  async importEmployees(treeId: string, rows: RawOrgRow[]): Promise<ImportResult> {
    const { employees, vacancies, rejectedRows } = normalizeOrgRows(rows);
    const { withManager, orphanWarnings } = resolveHierarchy(employees);

    let created = 0;
    let updated = 0;
    for (const [position, e] of withManager.entries()) {
      if (e.externalId) {
        const existing = await this.prisma.orgEmployee.findUnique({
          where: { orgTreeId_externalId: { orgTreeId: treeId, externalId: e.externalId } },
        });
        await this.prisma.orgEmployee.upsert({
          where: { orgTreeId_externalId: { orgTreeId: treeId, externalId: e.externalId } },
          create: {
            orgTreeId: treeId,
            externalId: e.externalId,
            name: e.name,
            role: e.role,
            email: e.email,
            managerExternalId: e.managerExternalId,
            isVacancy: e.isVacancy,
            position,
          },
          update: {
            name: e.name,
            role: e.role,
            email: e.email,
            managerExternalId: e.managerExternalId,
            isVacancy: e.isVacancy,
            position,
          },
        });
        if (existing) { updated += 1; } else { created += 1; }
      } else {
        await this.prisma.orgEmployee.create({
          data: {
            orgTreeId: treeId,
            name: e.name,
            role: e.role,
            email: e.email,
            managerExternalId: e.managerExternalId,
            isVacancy: e.isVacancy,
            position,
          },
        });
        created += 1;
      }
    }

    // Resolve managerId from managerExternalId within the tree
    const all = await this.prisma.orgEmployee.findMany({ where: { orgTreeId: treeId } });
    const byExternal = new Map(all.filter((e) => e.externalId).map((e) => [e.externalId as string, e.id]));
    for (const e of all) {
      const managerId = e.managerExternalId ? (byExternal.get(e.managerExternalId) ?? null) : null;
      if (managerId !== e.managerId) {
        await this.prisma.orgEmployee.update({ where: { id: e.id }, data: { managerId } });
      }
    }

    return { created, updated, vacancies, rejectedRows, orphanWarnings };
  }

  async addAlias(
    employeeId: string,
    input: { provider: string; kind: string; value: string },
  ): Promise<{ id: string }> {
    const row = await this.prisma.orgEmployeeAlias.create({
      data: { employeeId, provider: input.provider, kind: input.kind, value: input.value },
    });
    return { id: row.id };
  }

  async deleteAlias(aliasId: string): Promise<void> {
    await this.prisma.orgEmployeeAlias.delete({ where: { id: aliasId } });
  }

  async getEmployeeForActivity(
    id: string,
  ): Promise<{
    id: string;
    name: string;
    email: string | null;
    aliases: { provider: string; kind: string; value: string }[];
  } | null> {
    const e = await this.prisma.orgEmployee.findUnique({
      where: { id },
      include: { aliases: true },
    });
    if (!e) return null;
    return {
      id: e.id,
      name: e.name,
      email: e.email,
      aliases: e.aliases.map((a) => ({ provider: a.provider, kind: a.kind, value: a.value })),
    };
  }

  async getSyncStatus(treeId: string): Promise<SyncStatus> {
    const tree = await this.prisma.orgTree.findUnique({ where: { id: treeId } });
    const summary = (tree?.lastSyncSummary ?? null) as {
      matched?: number;
      total?: number;
      unmatched?: string[];
    } | null;
    return {
      state: 'idle',
      lastSyncedAt: tree?.lastSyncedAt ? tree.lastSyncedAt.toISOString() : null,
      matched: summary?.matched ?? 0,
      total: summary?.total ?? 0,
      unmatched: summary?.unmatched ?? [],
    };
  }

  async createEmployee(
    treeId: string,
    input: { name: string; role?: string | null; managerId?: string | null },
  ): Promise<{ id: string }> {
    const siblings = await this.prisma.orgEmployee.aggregate({
      where: { orgTreeId: treeId, managerId: input.managerId ?? null },
      _max: { position: true },
    });
    const row = await this.prisma.orgEmployee.create({
      data: {
        orgTreeId: treeId,
        name: input.name,
        role: input.role ?? null,
        managerId: input.managerId ?? null,
        position: (siblings._max.position ?? -1) + 1,
      },
    });
    return { id: row.id };
  }

  async updateEmployee(
    id: string,
    input: UpdateEmployeeProfileInput,
    opts: { canEditSalary: boolean },
  ): Promise<void> {
    const touchesSalary =
      input.salaryCurrent !== undefined || input.salaryCurrency !== undefined;
    if (touchesSalary && !opts.canEditSalary) {
      throw new OrgEmployeeForbiddenError();
    }
    const set = <K extends keyof UpdateEmployeeProfileInput>(key: K) =>
      input[key] !== undefined ? { [key]: input[key] } : {};
    await this.prisma.orgEmployee.update({
      where: { id },
      data: {
        ...set('name'),
        ...set('role'),
        ...set('email'),
        ...(input.employeeId !== undefined ? { employeeDisplayId: input.employeeId } : {}),
        ...set('businessTitle'),
        ...(input.hireDate !== undefined
          ? { hireDate: input.hireDate ? new Date(input.hireDate) : null }
          : {}),
        ...set('location'),
        ...set('employeeType'),
        ...set('timeType'),
        ...set('phone'),
        ...set('workAddress'),
        ...(opts.canEditSalary ? set('salaryCurrent') : {}),
        ...(opts.canEditSalary ? set('salaryCurrency') : {}),
      },
    });
  }

  async deleteEmployee(id: string): Promise<void> {
    const emp = await this.prisma.orgEmployee.findUnique({ where: { id } });
    if (!emp) return;
    await this.prisma.$transaction([
      this.prisma.orgEmployee.updateMany({
        where: { managerId: id },
        data: { managerId: emp.managerId },
      }),
      this.prisma.orgEmployee.delete({ where: { id } }),
    ]);
  }

  async moveEmployee(id: string, input: { managerId: string | null; position: number }): Promise<void> {
    const emp = await this.prisma.orgEmployee.findUnique({ where: { id } });
    if (!emp) return;
    const all = await this.prisma.orgEmployee.findMany({
      where: { orgTreeId: emp.orgTreeId },
      select: { id: true, managerId: true },
    });
    if (wouldCreateCycle(all, id, input.managerId)) {
      throw new OrgTreeCycleError();
    }
    const siblings = (
      await this.prisma.orgEmployee.findMany({
        where: { orgTreeId: emp.orgTreeId, managerId: input.managerId },
        orderBy: { position: 'asc' },
      })
    ).filter((s) => s.id !== id);
    const ordered = [
      ...siblings.slice(0, input.position),
      { id, isMoved: true },
      ...siblings.slice(input.position),
    ];
    await this.prisma.$transaction(
      ordered.map((s, i) =>
        this.prisma.orgEmployee.update({
          where: { id: s.id },
          data: (s as { id: string; isMoved?: boolean }).isMoved
            ? { managerId: input.managerId, position: i }
            : { position: i },
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.orgTree.delete({ where: { id } });
  }
}
