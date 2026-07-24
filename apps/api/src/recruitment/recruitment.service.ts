import type { PrismaClient, Prisma } from '@deckgauge/db';
import { boardCapabilities } from '@deckgauge/shared';

/** Column names the recruitment template seeds; used to map a candidate row to employee fields. */
const ROLE_COLUMN = 'Role';
const SALARY_COLUMN = 'Salary expectation';
const START_COLUMN = 'Target start';

export class RecruitmentError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'NOT_RECRUITMENT' | 'ALREADY_ONBOARDED',
  ) {
    super(message);
    this.name = 'RecruitmentError';
  }
}

/** Parse a NUMBER field value ("128000", "$128,000") to an integer, or null. */
export function parseSalary(value: string | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse a DATE field value (ISO string) to a Date, or null. */
export function parseStartDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface OnboardResult {
  employeeId: string;
}

type VacancyRow = { id: string; name: string; role: string | null; businessTitle: string | null };

/**
 * Find the single open vacancy in a tree whose name/role/business-title matches the
 * candidate's role (case-insensitive). Returns null when there is no match, or more
 * than one (ambiguous → caller adds a new node instead of guessing).
 */
async function findMatchingVacancy(
  tx: Prisma.TransactionClient,
  orgTreeId: string,
  role: string,
): Promise<VacancyRow | null> {
  const norm = (s: string | null) => (s ?? '').trim().toLowerCase();
  const target = norm(role);
  if (!target) return null;
  const vacancies = await tx.orgEmployee.findMany({
    where: { orgTreeId, isVacancy: true },
    select: { id: true, name: true, role: true, businessTitle: true },
  });
  const matches = vacancies.filter((v) =>
    [v.businessTitle, v.role, v.name].some((x) => norm(x) === target),
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

export class RecruitmentService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Onboard a recruitment candidate row into an org tree as a new OrgEmployee,
   * carrying over name, salary expectation, and target start date → hire date.
   * Idempotent: a row already onboarded throws ALREADY_ONBOARDED.
   */
  async onboardCandidate(
    projectId: string,
    orgTreeId: string,
    opts: { managerId?: string | null } = {},
  ): Promise<OnboardResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { board: true, fieldValues: true },
    });
    if (!project || !project.board) {
      throw new RecruitmentError('Candidate not found', 'NOT_FOUND');
    }
    if (!boardCapabilities(project.board.kind).onboardTarget) {
      throw new RecruitmentError('Board is not a recruitment board', 'NOT_RECRUITMENT');
    }
    if (project.onboardedEmployeeId) {
      throw new RecruitmentError('Candidate already onboarded', 'ALREADY_ONBOARDED');
    }

    // Map the candidate's column values to employee fields by column name.
    const columns = await this.prisma.boardColumn.findMany({
      where: { boardId: project.boardId ?? undefined },
      select: { id: true, name: true },
    });
    const valueOf = (columnName: string): string | undefined => {
      const col = columns.find((c) => c.name === columnName);
      if (!col) return undefined;
      return project.fieldValues.find((fv) => fv.columnId === col.id)?.value;
    };
    const salaryCurrent = parseSalary(valueOf(SALARY_COLUMN));
    const hireDate = parseStartDate(valueOf(START_COLUMN));
    const role = valueOf(ROLE_COLUMN)?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to keep onboarding idempotent under concurrency.
      const fresh = await tx.project.findUnique({
        where: { id: projectId },
        select: { onboardedEmployeeId: true },
      });
      if (fresh?.onboardedEmployeeId) {
        throw new RecruitmentError('Candidate already onboarded', 'ALREADY_ONBOARDED');
      }

      const roleFields = role !== null ? { role, businessTitle: role } : {};
      const salaryField = salaryCurrent !== null ? { salaryCurrent } : {};
      const hireField = hireDate !== null ? { hireDate } : {};

      // Fill a matching open vacancy if the role uniquely identifies one; else add a node.
      const vacancy = role ? await findMatchingVacancy(tx, orgTreeId, role) : null;
      let employeeId: string;
      if (vacancy) {
        await tx.orgEmployee.update({
          where: { id: vacancy.id },
          data: { name: project.name, isVacancy: false, ...roleFields, ...salaryField, ...hireField },
        });
        employeeId = vacancy.id;
      } else {
        const siblings = await tx.orgEmployee.aggregate({
          where: { orgTreeId, managerId: opts.managerId ?? null },
          _max: { position: true },
        });
        const employee = await tx.orgEmployee.create({
          data: {
            orgTreeId,
            name: project.name,
            managerId: opts.managerId ?? null,
            position: (siblings._max.position ?? -1) + 1,
            ...roleFields,
            ...salaryField,
            ...hireField,
          },
        });
        employeeId = employee.id;
      }

      // Carry the CV(s) over: link the candidate's uploads to the employee (same rows).
      await tx.upload.updateMany({
        where: { projectId },
        data: { orgEmployeeId: employeeId },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { onboardedEmployeeId: employeeId },
      });
      return { employeeId };
    });
  }
}
