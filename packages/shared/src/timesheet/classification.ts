export type Classification = 'CAPEX' | 'OPEX' | 'Unclassified';

/** Resolve an issue's classification: own value, else nearest classified ancestor, else Unclassified. */
export function resolveClassification(
  issueKey: string,
  ownClassification: Map<string, 'CAPEX' | 'OPEX'>,
  parentOf: Map<string, string>,
): Classification {
  const visited = new Set<string>();
  let current: string | undefined = issueKey;

  while (current !== undefined && !visited.has(current)) {
    const own = ownClassification.get(current);
    if (own) return own;
    visited.add(current);
    current = parentOf.get(current);
  }

  return 'Unclassified';
}
