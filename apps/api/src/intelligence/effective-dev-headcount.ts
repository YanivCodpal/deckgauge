// P6 — Effective developer headcount for per-capita comparison metrics.
//
// Comparing raw counts (PRs, commits) across teams of different sizes is
// misleading; a per-capita metric must divide by the number of people who
// actually produce code — i.e. developers, NOT the whole roster (which mixes
// in QA, DevOps, EMs, designers). This classifier partitions an org-tree
// roster into "effective developers" vs everyone else by role string, so a
// board of 18 people with ~10 devs normalises against 10, not 18
// (ref: Acme in the 2026-07 brief).
//
// Deliberately conservative: an employee counts as a developer only when their
// role reads like an engineering IC role AND does not read like a non-dev
// specialisation (QA / test / DevOps / SRE / manager / lead-only / design /
// product). Vacancies and inactive employees are excluded. When a role is
// absent we fall back to counting the person as a developer (most rosters are
// dev-heavy) unless another signal excludes them.

export interface RosterMember {
  role: string | null;
  isVacancy?: boolean;
  isActive?: boolean;
}

// Substrings that mark a role as NON-developer even if it also contains a
// dev-ish word (e.g. "QA Automation Engineer" is QA, not a dev seat).
const NON_DEV_ROLE_PATTERNS = [
  'qa',
  'quality assurance',
  'tester',
  'test engineer',
  'sdet',
  'devops',
  'sre',
  'site reliability',
  'platform ops',
  'manager',
  'scrum master',
  'product owner',
  'director',
  'head of',
  'chief',
  'designer',
  'ux',
  'ui/ux',
  'business analyst',
  'data analyst',
  'support',
];

// Substrings that positively mark a role as an engineering IC seat.
const DEV_ROLE_PATTERNS = [
  'developer',
  'engineer',
  'programmer',
  'software',
  'full stack',
  'fullstack',
  'front end',
  'frontend',
  'front-end',
  'back end',
  'backend',
  'back-end',
  'mobile',
  'ios',
  'android',
];

function normalize(role: string | null | undefined): string {
  return (role ?? '').trim().toLowerCase();
}

/** True when the member should count toward the effective-developer headcount. */
export function isEffectiveDeveloper(member: RosterMember): boolean {
  if (member.isVacancy) return false;
  if (member.isActive === false) return false;

  const role = normalize(member.role);
  // Unlabelled roster rows: assume dev (rosters skew dev-heavy) — the caller
  // still gates the whole board on having an org-tree link at all.
  if (role === '') return true;

  if (NON_DEV_ROLE_PATTERNS.some((p) => role.includes(p))) return false;
  if (DEV_ROLE_PATTERNS.some((p) => role.includes(p))) return true;

  // A labelled role that matches neither list (e.g. "Team Lead", "Architect")
  // is not counted as an IC developer seat.
  return false;
}

/** Number of effective developers in a roster (0 when the roster is empty). */
export function effectiveDevHeadcount(roster: ReadonlyArray<RosterMember>): number {
  return roster.reduce((n, m) => (isEffectiveDeveloper(m) ? n + 1 : n), 0);
}
