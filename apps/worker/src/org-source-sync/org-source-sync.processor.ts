import type { PrismaClient } from '@deckgauge/db';
import { buildOrgScope } from './build-org-scope.js';
import { reconcileScope, type OrgSourceSyncSummaryT } from '@deckgauge/shared';
import { GraphAuthError, type GraphDirectoryClient } from './graph-directory-client.js';

export interface RunSourceDeps {
  prisma: PrismaClient;
  /**
   * Builds a directory client from the tree's stored tokens — a user-pasted access
   * token (preferred) or a delegated refresh token. Injected so tests can supply a
   * fake. May throw (e.g. no usable token / Graph not configured); callers handle it
   * as a sync error.
   */
  makeClient: (tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
  }) => GraphDirectoryClient;
  nowIso: string;
}

// A directory client may expose a rotated refresh token after its first token
// exchange (Azure rotates them). Read it structurally so the processor doesn't
// depend on the concrete DelegatedGraphDirectoryClient type.
function rotatedRefreshToken(client: GraphDirectoryClient): string | null {
  const rotated = (client as { rotatedRefreshToken?: string | null }).rotatedRefreshToken;
  return typeof rotated === 'string' && rotated.length > 0 ? rotated : null;
}

function emptySummary(): OrgSourceSyncSummaryT {
  return { created: 0, updated: 0, departed: 0, skipped: 0, errors: [] };
}

export async function runOrgSourceSync(
  treeId: string,
  deps: RunSourceDeps,
): Promise<OrgSourceSyncSummaryT> {
  const { prisma, makeClient, nowIso } = deps;
  const now = new Date(nowIso);
  const summary = emptySummary();

  const source = await prisma.orgTreeSource.findUnique({ where: { orgTreeId: treeId } });
  if (!source) {
    summary.errors.push('No source configured for this tree');
    return summary;
  }

  // Preconditions — fail fast with an actionable message and never fall back to an
  // empty/unauthenticated client (the original silent-empty bug).
  if (!source.msAccessToken && !source.msRefreshToken) {
    summary.errors.push('Microsoft not connected — paste a Graph token in the Source tab');
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: { status: 'error', lastSyncSummary: summary as unknown as object },
    });
    return summary;
  }
  if (!source.rootUpn) {
    summary.errors.push('No root person set — enter the top person and Save before syncing');
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: { status: 'error', lastSyncSummary: summary as unknown as object },
    });
    return summary;
  }

  await prisma.orgTreeSource.update({ where: { orgTreeId: treeId }, data: { status: 'syncing' } });

  let client: GraphDirectoryClient;
  try {
    client = makeClient({ accessToken: source.msAccessToken, refreshToken: source.msRefreshToken });
  } catch (err: unknown) {
    summary.errors.push(err instanceof Error ? err.message : 'Graph client unavailable');
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: { status: 'error', lastSyncSummary: summary as unknown as object },
    });
    return summary;
  }

  // Resolve root first — a failure here must NOT mutate the roster.
  let root;
  try {
    root = await client.getUserByUpn(source.rootUpn);
  } catch (err: unknown) {
    // An expired/revoked token is a reconnect prompt, not a transient error: clear the
    // stored tokens so the UI asks for a fresh paste. Pasted access tokens expire ~1h.
    if (err instanceof GraphAuthError && err.invalidGrant) {
      summary.errors.push('Microsoft token expired — paste a fresh Graph token in the Source tab');
      await prisma.orgTreeSource.update({
        where: { orgTreeId: treeId },
        data: {
          status: 'error',
          msAccessToken: null,
          msRefreshToken: null,
          lastSyncSummary: summary as unknown as object,
        },
      });
      return summary;
    }
    summary.errors.push(err instanceof Error ? err.message : 'Graph authentication failed');
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: { status: 'error', lastSyncSummary: summary as unknown as object },
    });
    return summary;
  }

  if (!root) {
    // The token exchange already happened (getUserByUpn ran), so a rotated refresh
    // token must be persisted even on this error path or the next sync sees invalid_grant.
    const rotated = rotatedRefreshToken(client);
    summary.errors.push(`Root person not found in directory: ${source.rootUpn}`);
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: {
        status: 'error',
        lastSyncSummary: summary as unknown as object,
        ...(rotated ? { msRefreshToken: rotated } : {}),
      },
    });
    return summary;
  }

  try {
    const scope = await buildOrgScope(root, (id) => client.getDirectReports(id));
    const existing = await prisma.orgEmployee.findMany({
      where: { orgTreeId: treeId },
      select: { id: true, msGraphId: true },
    });
    const plan = reconcileScope(existing, scope);

    // Pass 1: upsert mapped fields, clear any prior departure.
    // Capture the db id from each upsert return to avoid a separate findFirst per row.
    const existingGraphIds = new Set(
      existing.filter((e) => e.msGraphId).map((e) => e.msGraphId),
    );
    const idByGraph = new Map<string, string>();
    for (const u of plan.upserts) {
      const fields = {
        name: u.mapped.name,
        businessTitle: u.mapped.businessTitle,
        email: u.mapped.email,
        location: u.mapped.location,
        phone: u.mapped.phone,
        employeeDisplayId: u.mapped.employeeDisplayId,
        employeeType: u.mapped.employeeType,
        hireDate: u.mapped.hireDate ? new Date(u.mapped.hireDate) : null,
        role: u.mapped.role,
        position: u.position,
        departedAt: null,
        syncedAt: now,
      };
      const row = await prisma.orgEmployee.upsert({
        where: { orgTreeId_msGraphId: { orgTreeId: treeId, msGraphId: u.msGraphId } },
        create: { orgTreeId: treeId, msGraphId: u.msGraphId, ...fields },
        update: fields,
      });
      idByGraph.set(u.msGraphId, row.id);
      if (existingGraphIds.has(u.msGraphId)) summary.updated += 1;
      else summary.created += 1;
    }

    // Pass 2: resolve managerGraphId -> managerId now that all rows exist.
    for (const u of plan.upserts) {
      const selfId = idByGraph.get(u.msGraphId);
      if (!selfId) continue;
      const managerId = u.managerGraphId ? idByGraph.get(u.managerGraphId) ?? null : null;
      await prisma.orgEmployee.update({ where: { id: selfId }, data: { managerId } });
    }

    // Departures — only reached when the full scope fetched successfully.
    if (plan.departedEmployeeIds.length > 0) {
      await prisma.orgEmployee.updateMany({
        where: { id: { in: plan.departedEmployeeIds } },
        data: { departedAt: now },
      });
      summary.departed = plan.departedEmployeeIds.length;
    }

    const rotated = rotatedRefreshToken(client);
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: {
        status: 'idle',
        rootGraphId: root.id,
        lastSyncedAt: now,
        lastSyncSummary: summary as unknown as object,
        // Azure rotates refresh tokens on exchange — persist the new one so the
        // next sync doesn't fail with invalid_grant.
        ...(rotated ? { msRefreshToken: rotated } : {}),
      },
    });
    return summary;
  } catch (err: unknown) {
    // Persist a rotated token here too — the exchange succeeded before the failure.
    const rotated = rotatedRefreshToken(client);
    summary.errors.push(err instanceof Error ? err.message : 'Unknown sync error');
    await prisma.orgTreeSource.update({
      where: { orgTreeId: treeId },
      data: {
        status: 'error',
        lastSyncSummary: summary as unknown as object,
        ...(rotated ? { msRefreshToken: rotated } : {}),
      },
    });
    return summary;
  }
}

export async function handleOrgSourceSyncJob(
  jobData: { treeId: string },
  prisma: PrismaClient,
  makeClient: (tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
  }) => GraphDirectoryClient,
): Promise<OrgSourceSyncSummaryT> {
  return runOrgSourceSync(jobData.treeId, {
    prisma,
    makeClient,
    nowIso: new Date().toISOString(),
  });
}
