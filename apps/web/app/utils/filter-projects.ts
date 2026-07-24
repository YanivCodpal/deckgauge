import type { Project, BoardStatus, ProjectStatus } from '@deckgauge/shared';

export interface FilterRule {
  column: string;
  condition: string;
  value: string;
}

type ProjectWithFields = Project & { fieldValues?: Record<string, string> };

// Human-readable labels for the legacy ProjectStatus enum. These mirror what
// the StatusPill renders, so a user filtering on the text they see (e.g.
// "In Progress") matches a project whose raw enum is "IN_PROGRESS".
const ENUM_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

// Resolve the status text the user actually sees for a project. Boards with
// dynamic statuses display the board status label (via statusId); legacy boards
// display the friendly enum label. Filtering must compare against this, not the
// raw enum — otherwise typing "Closed" or "In Progress" matches nothing.
function resolveStatusValue(
  project: ProjectWithFields,
  boardStatuses?: BoardStatus[]
): string {
  if (boardStatuses && boardStatuses.length > 0 && project.statusId) {
    const match = boardStatuses.find((s) => s.id === project.statusId);
    if (match) return match.label;
  }
  return ENUM_STATUS_LABELS[project.status] ?? project.status;
}

function valueForColumn(
  project: ProjectWithFields,
  column: string,
  boardStatuses?: BoardStatus[]
): string {
  if (column === 'status') return resolveStatusValue(project, boardStatuses);
  if (column === 'owner') return project.owner || '';
  return project.fieldValues?.[column] || '';
}

function matchesRule(
  project: ProjectWithFields,
  rule: FilterRule,
  boardStatuses?: BoardStatus[]
): boolean {
  const val = valueForColumn(project, rule.column, boardStatuses);
  const lower = val.toLowerCase();
  const ruleVal = rule.value.toLowerCase();

  switch (rule.condition) {
    case 'is':
      return lower === ruleVal;
    case 'is_not':
      return lower !== ruleVal;
    case 'contains':
      return lower.includes(ruleVal);
    case 'is_empty':
      return !val;
    default:
      return true;
  }
}

// Apply all filter rules conjunctively (AND). A project is kept only if it
// satisfies every rule.
export function applyFilterRules(
  projects: ProjectWithFields[],
  rules: FilterRule[],
  boardStatuses?: BoardStatus[]
): ProjectWithFields[] {
  if (rules.length === 0) return projects;
  return projects.filter((project) =>
    rules.every((rule) => matchesRule(project, rule, boardStatuses))
  );
}
