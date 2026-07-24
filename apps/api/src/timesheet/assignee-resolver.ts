import { buildMatchIndex, matchIdentity, type Provider } from '@deckgauge/shared';

export interface EmployeeWithAliases {
  id: string;
  name: string;
  aliases: { provider: string; kind: string; value: string }[];
}

/**
 * Build an assignee->employeeId resolver from org-chart employees + aliases.
 * The raw transition assignee string is treated as a display name, and also as
 * an email when it contains '@'. Reuses the shared alias-first / name-fallback
 * matcher. Returns null when the assignee is empty or unmatched.
 */
export function makeAssigneeResolver(
  employees: EmployeeWithAliases[],
): (assignee: string | null, provider: Provider) => string | null {
  const index = buildMatchIndex(employees);
  return (assignee, provider) => {
    if (!assignee) return null;
    return matchIdentity(
      { provider, name: assignee, email: assignee.includes('@') ? assignee : null },
      index,
    );
  };
}
