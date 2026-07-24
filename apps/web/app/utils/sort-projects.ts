import type { Project } from '@deckgauge/shared';

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

const STATUS_ORDER: Record<string, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  AT_RISK: 2,
  BLOCKED: 3,
  DONE: 4,
};

type ProjectWithFields = Project & { fieldValues?: Record<string, string> };

export function sortProjects(
  projects: ProjectWithFields[],
  sortConfig: SortConfig | null
): ProjectWithFields[] {
  if (!sortConfig) {
    return [...projects];
  }

  const { column, direction } = sortConfig;
  const modifier = direction === 'asc' ? 1 : -1;

  return [...projects].sort((a, b) => {
    let aVal: string | number | null | undefined;
    let bVal: string | number | null | undefined;

    switch (column) {
      case 'name':
        aVal = a.name?.toLowerCase() ?? null;
        bVal = b.name?.toLowerCase() ?? null;
        break;
      case 'owner':
        aVal = a.owner?.toLowerCase() ?? null;
        bVal = b.owner?.toLowerCase() ?? null;
        break;
      case 'status':
        aVal = STATUS_ORDER[a.status] ?? null;
        bVal = STATUS_ORDER[b.status] ?? null;
        break;
      case 'updated':
        aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : null;
        bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : null;
        break;
      default: {
        // Custom column - look up in fieldValues
        const aField = a.fieldValues?.[column];
        const bField = b.fieldValues?.[column];
        aVal = aField != null ? aField.toLowerCase() : null;
        bVal = bField != null ? bField.toLowerCase() : null;
        break;
      }
    }

    // Null/undefined values sort to the end regardless of direction
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal < bVal) return -1 * modifier;
    if (aVal > bVal) return 1 * modifier;
    return 0;
  });
}
