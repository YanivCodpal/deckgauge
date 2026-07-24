import { PrismaClient } from '@deckgauge/db';
import { LEGACY_STATUS_LABELS, STATUS_COLORS } from '@deckgauge/shared';
import { ensureDefaultGroup } from './sync-default-group.js';

export interface AdoPromoteResult {
  created: number;
  updated: number;
  markedRemoved: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map board status label back to legacy ProjectStatus enum for the required `status` column. */
const LABEL_TO_ENUM: Record<string, string> = {
  'not started': 'NOT_STARTED',
  'in progress': 'IN_PROGRESS',
  'at risk': 'AT_RISK',
  blocked: 'BLOCKED',
  done: 'DONE',
};

interface CachedBoardStatus {
  id: string;
  label: string;
  color: string;
}

/** Existing-project row snapshotted per board before promotion. */
interface ExistingProjectRow {
  id: string;
  adoWorkItemId: number | null;
  status: string;
  statusId: string | null;
  adoSyncedFields: unknown;
  ownerOverridden: boolean;
}

/** The BoardAdoSource fields the promote state machine reads. */
interface BoardSourceConfig {
  id: string;
  boardId: string;
  targetGroupId: string | null;
  statusMapping: unknown;
  fieldMappings: unknown;
  defaultSyncedFields: unknown;
  allowedWorkItemTypes: unknown;
}

/**
 * Mutable per-(board source) promotion state. Snapshotted once, then carried
 * across streamed work-item batches so a large project can be promoted
 * incrementally without buffering every item. mark-removed runs once at
 * finalize, after every batch has contributed to `seenAdoIds`.
 */
interface BoardPromoteState {
  boardSource: BoardSourceConfig;
  adoProject: string;
  statusMapping: Record<string, string>;
  fieldMappings: Record<string, string>;
  defaultSyncedFields: string[];
  allowedWorkItemTypes: string[];
  statusCache: Map<string, CachedBoardStatus>;
  projectByAdoId: Map<number | null, ExistingProjectRow>;
  groupId: string | null;
  excludedAdoIds: Set<string>;
  seenAdoIds: number[];
  created: number;
  updated: number;
  markedRemoved: number;
}

/**
 * Minimal ADO work-item shape the promote service needs. Sourced from the
 * AzureDevOpsPort adapter's fetchWorkItems output — fed in-memory by the
 * processor. Previously read from Postgres `azure_devops_work_items`, dropped
 * in 20260603120000_drop_legacy_phase3_tables.
 */
export interface PromoteAdoWorkItem {
  adoId: number;
  adoProject: string;
  type: string;
  title: string;
  state: string;
  description?: string | null;
  assignedTo?: string | null;
  areaPath?: string | null;
  iterationPath?: string | null;
  adoParentId?: number | null;
}

export interface AdoPromotePayload {
  /** Unfiltered work items, keyed by adoProject. */
  workItemsByProject: Record<string, PromoteAdoWorkItem[]>;

  /**
   * Optional. ID sets keyed by board source ID. When present for a board
   * source, the promote service intersects the filtered work-item list
   * with the IDs in the set. Boards without a WIQL filter are omitted
   * from this map.
   */
  wiqlIdsByBoardSource?: Record<string, Set<number>>;
}

export class AzureDevOpsPromoteService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Buffered promotion: every project's work items are supplied up front in
   * `payload`. Iterates all project syncs (1 per (instance, adoProject)); each
   * fans out to N board sources. Shares the per-board state machine with
   * promoteProjectStream so behaviour is identical whether items arrive all at
   * once or batch-by-batch.
   */
  async promoteAll(
    payload: AdoPromotePayload = { workItemsByProject: {} },
  ): Promise<AdoPromoteResult> {
    const projectSyncs = await this.prisma.azureDevOpsProjectSync.findMany({
      include: { boardSources: true },
    });

    let created = 0;
    let updated = 0;
    let markedRemoved = 0;

    for (const ps of projectSyncs) {
      const items: PromoteAdoWorkItem[] = payload.workItemsByProject[ps.adoProject] ?? [];
      for (const boardSource of ps.boardSources) {
        const state = await this.initBoardState(boardSource, ps.adoProject);
        await this.processBatchForBoard(
          state,
          items,
          payload.wiqlIdsByBoardSource?.[boardSource.id],
        );
        await this.finalizeBoard(state);
        created += state.created;
        updated += state.updated;
        markedRemoved += state.markedRemoved;
      }
    }

    return { created, updated, markedRemoved };
  }

  /**
   * Streaming promotion used by the worker for large projects: promote work
   * items batch-by-batch so a 20k+ project is never buffered in full. Board
   * sources are scoped to a single (adoProject, instance); every batch is
   * applied to each board source, and mark-removed runs once after the stream
   * drains (it needs the complete seen-id set).
   */
  async promoteProjectStream(opts: {
    adoProject: string;
    instanceId: string;
    batches: AsyncIterable<PromoteAdoWorkItem[]>;
    wiqlIdsByBoardSource?: Record<string, Set<number>>;
  }): Promise<AdoPromoteResult> {
    const projectSyncs = await this.prisma.azureDevOpsProjectSync.findMany({
      where: { adoProject: opts.adoProject, azureDevOpsInstanceId: opts.instanceId },
      include: { boardSources: true },
    });

    const states: BoardPromoteState[] = [];
    for (const ps of projectSyncs) {
      for (const boardSource of ps.boardSources) {
        states.push(await this.initBoardState(boardSource, opts.adoProject));
      }
    }

    for await (const batch of opts.batches) {
      for (const state of states) {
        await this.processBatchForBoard(
          state,
          batch,
          opts.wiqlIdsByBoardSource?.[state.boardSource.id],
        );
      }
    }

    let created = 0;
    let updated = 0;
    let markedRemoved = 0;
    for (const state of states) {
      await this.finalizeBoard(state);
      created += state.created;
      updated += state.updated;
      markedRemoved += state.markedRemoved;
    }

    return { created, updated, markedRemoved };
  }

  /** Snapshot per-board config, status cache, and existing projects for incremental promotion. */
  private async initBoardState(
    boardSource: BoardSourceConfig,
    adoProject: string,
  ): Promise<BoardPromoteState> {
    // Batch-fetch existing ADO projects scoped to THIS board (multi-board fan-out:
    // the same adoWorkItemId can exist on multiple boards, so scope by boardId).
    const existingProjects = await this.prisma.project.findMany({
      where: { boardId: boardSource.boardId, adoProject },
      select: { id: true, adoWorkItemId: true, status: true, statusId: true, adoSyncedFields: true, ownerOverridden: true },
    });
    const projectByAdoId = new Map<number | null, ExistingProjectRow>(
      existingProjects.map((p): [number | null, ExistingProjectRow] => [p.adoWorkItemId, p]),
    );

    const exclusions = await this.prisma.boardSyncExclusion.findMany({
      where: { boardId: boardSource.boardId, source: 'ADO' },
      select: { externalId: true },
    });

    return {
      boardSource,
      adoProject,
      statusMapping: (boardSource.statusMapping ?? {}) as Record<string, string>,
      fieldMappings: (boardSource.fieldMappings ?? {}) as Record<string, string>,
      defaultSyncedFields: (boardSource.defaultSyncedFields ?? [
        'name',
        'status',
        'owner',
      ]) as string[],
      allowedWorkItemTypes: (boardSource.allowedWorkItemTypes ?? []) as string[],
      statusCache: await this.loadStatusCache(boardSource.boardId),
      projectByAdoId,
      // Resolve group lazily — only create a default group on first new-project
      // creation, so syncs with no new items don't leave empty groups behind.
      groupId: boardSource.targetGroupId,
      excludedAdoIds: new Set(exclusions.map((e) => e.externalId)),
      seenAdoIds: [],
      created: 0,
      updated: 0,
      markedRemoved: 0,
    };
  }

  /** Promote one batch of work items into one board source, mutating `state`. */
  private async processBatchForBoard(
    state: BoardPromoteState,
    items: PromoteAdoWorkItem[],
    wiqlIds?: Set<number>,
  ): Promise<void> {
    let workItems = items;
    if (state.allowedWorkItemTypes.length > 0) {
      workItems = workItems.filter((wi) => state.allowedWorkItemTypes.includes(wi.type));
    }
    if (wiqlIds !== undefined) {
      workItems = workItems.filter((wi) => wiqlIds.has(wi.adoId));
    }
    if (state.excludedAdoIds.size > 0) {
      workItems = workItems.filter((wi) => !state.excludedAdoIds.has(String(wi.adoId)));
    }

    const boardId = state.boardSource.boardId;

    for (const item of workItems) {
      state.seenAdoIds.push(item.adoId);

      const existing = state.projectByAdoId.get(item.adoId) ?? null;

      const statusId = await this.resolveStatusId(
        item.state,
        state.statusMapping,
        boardId,
        state.statusCache,
      );
      const legacyStatus = this.toLegacyEnum(statusId, state.statusCache);

      if (!existing) {
        if (state.groupId === null) {
          state.groupId = await ensureDefaultGroup(this.prisma, boardId, state.adoProject);
        }
        const newProject = await this.prisma.project.create({
          data: {
            name: item.title,
            description: item.description,
            status: legacyStatus as never,
            statusId,
            owner: item.assignedTo ?? '',
            assignee: item.assignedTo ?? '',
            boardId,
            groupId: state.groupId,
            adoWorkItemId: item.adoId,
            adoProject: state.adoProject,
            adoSyncedFields: state.defaultSyncedFields,
            adoRemovedFromSource: false,
          },
        });
        state.created++;

        await this.prisma.projectStatusChange.create({
          data: {
            projectId: newProject.id,
            fromStatus: null,
            toStatus: this.labelFromCache(statusId, state.statusCache) ?? legacyStatus,
            changedBy: 'sync:azure-devops',
          },
        });

        await this.applyFieldMappings(
          state.fieldMappings,
          item as unknown as Record<string, unknown>,
          newProject.id,
        );
      } else {
        const syncedFields = (existing.adoSyncedFields ?? state.defaultSyncedFields) as string[];
        const updateData: Record<string, unknown> = {
          adoRemovedFromSource: false,
        };

        if (syncedFields.includes('name')) {
          updateData.name = item.title;
        }
        if (syncedFields.includes('status')) {
          updateData.statusId = statusId;
          updateData.status = legacyStatus;
        }
        if (syncedFields.includes('owner')) {
          // Always refresh the synced Assignee; only overwrite the editable
          // Owner while it still follows the assignee (not manually set).
          updateData.assignee = item.assignedTo ?? '';
          if (!existing.ownerOverridden) {
            updateData.owner = item.assignedTo ?? '';
          }
        }
        if (syncedFields.includes('description')) {
          updateData.description = item.description;
        }

        await this.prisma.project.update({
          where: { id: existing.id },
          data: updateData,
        });
        state.updated++;

        if (updateData.status && updateData.status !== existing.status) {
          await this.prisma.projectStatusChange.create({
            data: {
              projectId: existing.id,
              fromStatus:
                this.labelFromCache(existing.statusId as string, state.statusCache) ??
                (existing.status as string),
              toStatus: this.labelFromCache(statusId, state.statusCache) ?? legacyStatus,
              changedBy: 'sync:azure-devops',
            },
          });
        }

        await this.applyFieldMappings(
          state.fieldMappings,
          item as unknown as Record<string, unknown>,
          existing.id,
        );
      }
    }
  }

  /** Mark-removed for one board source after all its batches have been processed. */
  private async finalizeBoard(state: BoardPromoteState): Promise<void> {
    // Projects on THIS board for this ADO project that are no longer in the work
    // items list. Scoped by boardId for multi-board fan-out.
    const markResult = await this.prisma.project.updateMany({
      where: {
        boardId: state.boardSource.boardId,
        adoProject: state.adoProject,
        adoWorkItemId: { notIn: state.seenAdoIds },
        adoRemovedFromSource: false,
      },
      data: { adoRemovedFromSource: true },
    });
    state.markedRemoved += markResult.count;
  }

  /**
   * Resolve an ADO work item state string to a board_status ID.
   *
   * Resolution order:
   * 1. Explicit mapping value (UUID → direct; legacy enum → label lookup; label string → cache)
   * 2. Case-insensitive label match on the board
   * 3. Upsert a new board status with the ADO state name
   */
  private async resolveStatusId(
    adoState: string,
    statusMap: Record<string, string>,
    boardId: string,
    cache: Map<string, CachedBoardStatus>,
  ): Promise<string> {
    const mapped = statusMap[adoState];
    if (mapped) {
      // Already a board status UUID — but only use it if it belongs to this board
      if (UUID_RE.test(mapped)) {
        for (const s of cache.values()) {
          if (s.id === mapped) return mapped;
        }
        // UUID not on this board — fall through to other resolution methods
      }

      // Legacy enum value (e.g. "NOT_STARTED") → resolve label
      const label = LEGACY_STATUS_LABELS[mapped];
      if (label) {
        const cached = cache.get(label.toLowerCase());
        if (cached) return cached.id;
      }

      // Mapped value might be a label itself
      const byLabel = cache.get(mapped.toLowerCase());
      if (byLabel) return byLabel.id;
    }

    // Fallback: case-insensitive match on ADO state name
    const byName = cache.get(adoState.toLowerCase());
    if (byName) return byName.id;

    // No match — upsert a new board status
    return this.upsertBoardStatus(adoState, boardId, cache);
  }

  /** Create a new board status for an unknown ADO state, handling race conditions. */
  private async upsertBoardStatus(
    label: string,
    boardId: string,
    cache: Map<string, CachedBoardStatus>,
  ): Promise<string> {
    try {
      const color = this.pickUnusedColor(cache);
      const maxOrder = await this.prisma.boardStatus.aggregate({
        where: { boardId },
        _max: { order: true },
      });

      const created = await this.prisma.boardStatus.create({
        data: {
          boardId,
          label,
          color,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });

      cache.set(label.toLowerCase(), { id: created.id, label: created.label, color });
      return created.id;
    } catch (err: unknown) {
      // Unique constraint violation (P2002) — concurrent sync created it first
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        const existing = await this.prisma.boardStatus.findFirst({
          where: { boardId, label: { equals: label, mode: 'insensitive' } },
        });
        if (existing) {
          cache.set(label.toLowerCase(), { id: existing.id, label: existing.label, color: '' });
          return existing.id;
        }
      }
      throw err;
    }
  }

  /**
   * Pick a color for a new board status. Prefers a color not yet used on this
   * board; once the palette is exhausted, reuses the least-used color so colors
   * stay balanced instead of colliding arbitrarily. Duplicate colors per board
   * are allowed — the UNIQUE(board_id, color) index was dropped in
   * 20260619000000_drop_board_status_color_unique, so a board can hold more
   * statuses than there are palette colors without the insert failing.
   */
  private pickUnusedColor(cache: Map<string, CachedBoardStatus>): string {
    const counts = new Map<string, number>();
    for (const color of STATUS_COLORS) counts.set(color, 0);
    for (const s of cache.values()) {
      if (counts.has(s.color)) counts.set(s.color, (counts.get(s.color) ?? 0) + 1);
    }

    let best: string = STATUS_COLORS[0]!;
    let bestCount = Infinity;
    for (const color of STATUS_COLORS) {
      const count = counts.get(color) ?? 0;
      if (count < bestCount) {
        bestCount = count;
        best = color;
      }
    }
    return best;
  }

  /** Load all board statuses into a lowercase-label-keyed cache (includes color for pickUnusedColor). */
  private async loadStatusCache(boardId: string): Promise<Map<string, CachedBoardStatus>> {
    const statuses = await this.prisma.boardStatus.findMany({
      where: { boardId },
      select: { id: true, label: true, color: true },
    });
    const cache = new Map<string, CachedBoardStatus>();
    for (const s of statuses) {
      cache.set(s.label.toLowerCase(), { id: s.id, label: s.label, color: s.color });
    }
    return cache;
  }

  /** Map a board status ID back to the legacy ProjectStatus enum value. */
  private toLegacyEnum(statusId: string, cache: Map<string, CachedBoardStatus>): string {
    for (const s of cache.values()) {
      if (s.id === statusId) {
        return LABEL_TO_ENUM[s.label.toLowerCase()] ?? 'NOT_STARTED';
      }
    }
    return 'NOT_STARTED';
  }

  /** Find the human-readable label for a board status ID by scanning the cache. */
  private labelFromCache(statusId: string, cache: Map<string, CachedBoardStatus>): string | null {
    for (const s of cache.values()) {
      if (s.id === statusId) return s.label;
    }
    return null;
  }

  private async applyFieldMappings(
    fieldMappings: Record<string, string>,
    item: Record<string, unknown>,
    projectId: string,
  ): Promise<void> {
    for (const [adoField, columnId] of Object.entries(fieldMappings)) {
      const value = item[adoField];
      if (value === undefined || value === null) continue;

      const stringValue = String(value);
      await this.prisma.projectFieldValue.upsert({
        where: { projectId_columnId: { projectId, columnId } },
        update: { value: stringValue },
        create: { projectId, columnId, value: stringValue },
      });
    }
  }
}
