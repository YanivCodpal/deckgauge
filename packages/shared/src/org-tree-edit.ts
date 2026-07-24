export function wouldCreateCycle(
  employees: { id: string; managerId: string | null }[],
  employeeId: string,
  newManagerId: string | null
): boolean {
  if (newManagerId === null) return false;
  if (newManagerId === employeeId) return true;
  const byId = new Map(employees.map((e) => [e.id, e]));
  // walk up from the proposed manager; if we reach employeeId, it's a descendant -> cycle
  let cur: string | null = newManagerId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === employeeId) return true;
    if (seen.has(cur)) break; // guard against pre-existing corruption
    seen.add(cur);
    cur = byId.get(cur)?.managerId ?? null;
  }
  return false;
}
