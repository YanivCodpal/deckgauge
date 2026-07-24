import { buildClassificationRow, type ClassifiableRow } from '../projects/classification-mirror.js';

export interface BackfillDeps {
  listClassifiedProjects: () => Promise<ClassifiableRow[]>;
  insert: (table: string, rows: unknown[]) => Promise<void>;
}

/** Mirror every sourced+classified Project into board_item_classification. Idempotent (ReplacingMergeTree). */
export async function backfillClassificationMirror(
  deps: BackfillDeps,
): Promise<{ scanned: number; mirrored: number }> {
  const projects = await deps.listClassifiedProjects();
  const rows = projects.map(buildClassificationRow).filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length > 0) {
    await deps.insert('board_item_classification', rows);
  }
  return { scanned: projects.length, mirrored: rows.length };
}

async function runFromCli(): Promise<void> {
  const { PrismaClient, chInsertMany } = await import('@deckgauge/db');
  const prisma = new PrismaClient();
  try {
    const result = await backfillClassificationMirror({
      listClassifiedProjects: () =>
        prisma.project.findMany({
          where: { costClassification: { not: null } },
          select: {
            id: true,
            boardId: true,
            jiraKey: true,
            adoWorkItemId: true,
            adoProject: true,
            githubIssueId: true,
            costClassification: true,
          },
        }) as Promise<ClassifiableRow[]>,
      insert: (table, rows) => chInsertMany(table, rows as Record<string, unknown>[]),
    });
    console.log(`Backfill complete: scanned ${result.scanned}, mirrored ${result.mirrored}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runFromCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
