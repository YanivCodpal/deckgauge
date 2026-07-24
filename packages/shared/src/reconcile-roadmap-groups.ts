export interface ExistingRow {
  groupId: string;
  position: number;
  source: 'MANUAL' | 'BOARD_SUB';
}

export interface ReconcileInput {
  existing: ExistingRow[];
  subscribedBoardIds: string[];
  subscribedGroups: { groupId: string; boardId: string }[];
  liveGroupIds: Set<string>;
}

export interface ReconcileResult {
  toCreate: { groupId: string; position: number; source: 'BOARD_SUB' }[];
  toDelete: string[];
  effective: { groupId: string; position: number; source: 'MANUAL' | 'BOARD_SUB' }[];
}

export function reconcileRoadmapGroups(input: ReconcileInput): ReconcileResult {
  const subscribed = new Set(input.subscribedBoardIds);
  const existingByGroup = new Map(input.existing.map((r) => [r.groupId, r]));

  // Groups that a current subscription says should be present.
  const wantedFromSubs = input.subscribedGroups.filter(
    (g) => subscribed.has(g.boardId) && input.liveGroupIds.has(g.groupId),
  );
  const wantedSubGroupIds = new Set(wantedFromSubs.map((g) => g.groupId));

  const toDelete: string[] = [];
  const kept: ExistingRow[] = [];
  for (const row of input.existing) {
    if (!input.liveGroupIds.has(row.groupId)) {
      toDelete.push(row.groupId); // group deleted
      continue;
    }
    if (row.source === 'BOARD_SUB' && !wantedSubGroupIds.has(row.groupId)) {
      toDelete.push(row.groupId); // board unsubscribed; not manual
      continue;
    }
    kept.push(row);
  }

  // Append any wanted subscription group not already present, at the end.
  let nextPos = kept.reduce((m, r) => Math.max(m, r.position), -1) + 1;
  const toCreate: ReconcileResult['toCreate'] = [];
  for (const g of wantedFromSubs) {
    if (existingByGroup.has(g.groupId)) continue; // already a row (manual or sub)
    toCreate.push({ groupId: g.groupId, position: nextPos, source: 'BOARD_SUB' });
    nextPos += 1;
  }

  const effective = [
    ...kept.map((r) => ({ groupId: r.groupId, position: r.position, source: r.source })),
    ...toCreate.map((c) => ({ groupId: c.groupId, position: c.position, source: c.source as 'BOARD_SUB' })),
  ].sort((a, b) => a.position - b.position || a.groupId.localeCompare(b.groupId));

  return { toCreate, toDelete, effective };
}
