// Investment allocation — classifies a canonical issue `type` (already
// provider-normalized by issuesUnion: Jira issue_type, ADO work_item_type,
// GitHub label-derived) into a coarse "where does engineering effort go"
// category, then aggregates raw per-type counts into ordered donut slices.
//
// Kept pure and provider-agnostic in `shared` so the API builder (which only
// emits GROUP BY type) and any future web-side consumer classify identically,
// and so the mapping is unit-testable without ClickHouse. Mirrors the
// org-ranking.ts pattern: business logic in shared, SQL stays dumb.

export const INVESTMENT_CATEGORIES = [
  { key: 'feature', label: 'Feature Work' },
  { key: 'bug', label: 'Bugs & Defects' },
  { key: 'tech_debt', label: 'Tech Debt' },
  { key: 'maintenance', label: 'Maintenance / KTLO' },
  { key: 'other', label: 'Other' },
] as const;

export type InvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number]['key'];

const LABEL_BY_CATEGORY: Record<InvestmentCategory, string> = Object.fromEntries(
  INVESTMENT_CATEGORIES.map((c) => [c.key, c.label])
) as Record<InvestmentCategory, string>;

// Substring keyword rules, evaluated in priority order. The first matching
// group wins, so more specific groups (bug, tech-debt) are checked before the
// generic "task/maintenance" bucket — e.g. "Technical Debt" contains "debt"
// (→ tech_debt) and must not fall through to "task". Matching is substring on
// the lower-cased type so "New Feature", "User Story", "Sub-task" all resolve.
const CATEGORY_KEYWORDS: ReadonlyArray<{ category: InvestmentCategory; keywords: string[] }> = [
  { category: 'bug', keywords: ['bug', 'defect', 'incident', 'hotfix'] },
  { category: 'tech_debt', keywords: ['debt', 'refactor'] },
  {
    category: 'feature',
    keywords: ['feature', 'story', 'epic', 'initiative', 'enhancement', 'improvement'],
  },
  {
    category: 'maintenance',
    keywords: ['task', 'chore', 'maintenance', 'support', 'spike', 'ops'],
  },
];

/**
 * Map a canonical issue type string to its investment category. Unknown, empty,
 * or unmatched types fall to 'other'. Case-insensitive substring match.
 */
export function classifyInvestmentType(type: string | null | undefined): InvestmentCategory {
  const t = (type ?? '').trim().toLowerCase();
  if (!t) return 'other';
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return category;
  }
  return 'other';
}

export interface InvestmentTypeCount {
  type: string;
  count: number;
}

export interface InvestmentSlice {
  category: InvestmentCategory;
  label: string;
  count: number;
  /** Share of the total, 0–100, rounded to one decimal. */
  pct: number;
}

export interface InvestmentAllocation {
  slices: InvestmentSlice[];
  total: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Aggregate raw per-type counts into category slices in the canonical
 * INVESTMENT_CATEGORIES order. Only categories with a non-zero count are
 * returned (a clean donut), each carrying its percentage of the total. An
 * empty or all-zero input yields `{ slices: [], total: 0 }`.
 */
export function aggregateInvestmentAllocation(
  rows: InvestmentTypeCount[]
): InvestmentAllocation {
  const totals = new Map<InvestmentCategory, number>();
  for (const { type, count } of rows) {
    if (!Number.isFinite(count) || count <= 0) continue;
    const category = classifyInvestmentType(type);
    totals.set(category, (totals.get(category) ?? 0) + count);
  }

  const total = [...totals.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return { slices: [], total: 0 };

  const slices: InvestmentSlice[] = INVESTMENT_CATEGORIES.filter(
    (c) => (totals.get(c.key) ?? 0) > 0
  ).map((c) => {
    const count = totals.get(c.key) as number;
    return {
      category: c.key,
      label: LABEL_BY_CATEGORY[c.key],
      count,
      pct: round1((count / total) * 100),
    };
  });

  return { slices, total };
}
