export interface MatchIndex {
  byName: Map<string, Set<string>>;          // flKey -> employeeIds
  byAlias: Map<string, string>;              // `${provider}|${kind}|${valueLower}` -> employeeId
  byEmail: Map<string, Set<string>>;         // emailLower -> employeeIds (provider-agnostic)
}

export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameFromEmail(email: string): string | null {
  const local = (email.split('@')[0] ?? '').toLowerCase();
  const parts = local.split(/[._]+/).filter((p) => p && !/^\d+$/.test(p));
  return parts.length >= 2 ? parts.join(' ') : null;
}

export function flKey(name: string): string | null {
  const t = normalizeName(name).split(' ').filter(Boolean);
  return t.length >= 2 ? `${t[0]}|${t[t.length - 1]}` : null;
}

export function buildMatchIndex(
  employees: {
    id: string;
    name: string;
    email?: string | null;
    aliases: { provider: string; kind: string; value: string }[];
  }[]
): MatchIndex {
  const byName = new Map<string, Set<string>>();
  const byAlias = new Map<string, string>();
  const byEmail = new Map<string, Set<string>>();
  const addName = (name: string, id: string): void => {
    const k = flKey(name);
    if (!k) return;
    if (!byName.has(k)) byName.set(k, new Set());
    byName.get(k)!.add(id);
  };
  // An email is a strong, provider-agnostic identifier: the same address maps to
  // the same person whether it appears on a github commit, an ADO commit, or a
  // jira assignee. Index the employee's profile email and any email alias here so
  // a directory/Workday-synced tree (profile email populated, no aliases) still
  // matches activity by author email. Ambiguity-guarded like byName.
  const addEmail = (email: string, id: string): void => {
    const k = email.toLowerCase();
    if (!k) return;
    if (!byEmail.has(k)) byEmail.set(k, new Set());
    byEmail.get(k)!.add(id);
  };
  for (const e of employees) {
    addName(e.name, e.id);
    if (e.email) addEmail(e.email, e.id);
    for (const a of e.aliases) {
      byAlias.set(`${a.provider}|${a.kind}|${a.value.toLowerCase()}`, e.id);
      // A `name` alias is an alternate display name (e.g. the org name is a
      // single token, but the provider shows "First Last"). Fold it into the
      // name index so the ambiguity-guarded first|last match can find it. It is
      // provider-agnostic on purpose — display names are reused across providers.
      if (a.kind === 'name') addName(a.value, e.id);
      if (a.kind === 'email') addEmail(a.value, e.id);
    }
  }
  return { byName, byAlias, byEmail };
}

export function matchIdentity(
  identity: { provider: string; login?: string | null; name?: string | null; email?: string | null },
  index: MatchIndex
): string | null {
  // 1) alias-first (high confidence)
  if (identity.login) {
    const hit = index.byAlias.get(`${identity.provider}|login|${identity.login.toLowerCase()}`);
    if (hit) return hit;
  }
  if (identity.email) {
    const hit = index.byAlias.get(`${identity.provider}|email|${identity.email.toLowerCase()}`);
    if (hit) return hit;
    // Provider-agnostic email match (profile email or any email alias). Email is
    // a strong identifier, so this is still high-confidence; ambiguity-guarded.
    const ids = index.byEmail.get(identity.email.toLowerCase());
    if (ids && ids.size === 1) return [...ids][0] ?? null;
  }
  // 2) name candidates (ambiguity-guarded)
  const candidates: string[] = [];
  if (identity.email) {
    const dn = nameFromEmail(identity.email);
    if (dn) candidates.push(dn);
  }
  if (identity.name) candidates.push(identity.name);
  if (identity.login && identity.login.includes('@')) {
    const dn = nameFromEmail(identity.login);
    if (dn) candidates.push(dn);
  }
  if (identity.login && !identity.login.includes('@')) candidates.push(identity.login);
  for (const c of candidates) {
    const k = flKey(c);
    if (!k) continue;
    const ids = index.byName.get(k);
    if (ids && ids.size === 1) return [...ids][0] ?? null;
  }
  return null;
}
