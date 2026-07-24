import type { PrismaClient } from '@deckgauge/db';
import { GraphAuthError } from '../org-source-sync/graph-directory-client.js';
import { isInterviewEvent, parseCandidateName } from './calendar-parse.js';
import { GraphCalendarClient, type CalendarClient } from './graph-calendar-client.js';

/** Column the recruitment template seeds; interview dates land here (by exact name). */
const INTERVIEW_DATE_COLUMN = 'Interview date';

// Sync window: recent past (catch just-added interviews) through the near future.
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_BEFORE_DAYS = 14;
const WINDOW_AFTER_DAYS = 60;

export interface CalendarSourceSyncResult {
  scanned: number;
  created: number;
  updated: number;
  error?: string;
}

export interface RunCalendarSyncDeps {
  prisma: PrismaClient;
  /** Reads the calendar window from Graph. Injected so tests supply a fake. */
  client: CalendarClient;
  /** Passed in (rather than read from the clock) so the window is deterministic in tests. */
  now: Date;
}

async function fail(
  prisma: PrismaClient,
  boardId: string,
  scanned: number,
  message: string,
): Promise<CalendarSourceSyncResult> {
  await prisma.boardCalendarSource.update({
    where: { boardId },
    data: { status: 'error', lastSyncSummary: { error: message } as unknown as object },
  });
  return { scanned, created: 0, updated: 0, error: message };
}

/**
 * Pull a recruitment board's interview events from Microsoft Graph and materialize each
 * as a candidate Project row (deduped on (boardId, calendarEventId)), refreshing the
 * "Interview date" column. Mirrors runOrgSourceSync's shape: precondition checks fail
 * fast with an actionable status, a GraphAuthError is recorded (not thrown), and the
 * source row carries the run summary.
 */
export async function runCalendarSourceSync(
  boardId: string,
  deps: RunCalendarSyncDeps,
): Promise<CalendarSourceSyncResult> {
  const { prisma, client, now } = deps;

  const source = await prisma.boardCalendarSource.findUnique({ where: { boardId } });
  if (!source) {
    return { scanned: 0, created: 0, updated: 0, error: 'No calendar source configured for this board' };
  }
  if (!source.msAccessToken || !source.calendarUpn) {
    return fail(
      prisma,
      boardId,
      0,
      'Microsoft calendar not connected — paste a Graph token and set the calendar owner in the Source tab',
    );
  }

  await prisma.boardCalendarSource.update({ where: { boardId }, data: { status: 'syncing' } });

  const fromISO = new Date(now.getTime() - WINDOW_BEFORE_DAYS * DAY_MS).toISOString();
  const toISO = new Date(now.getTime() + WINDOW_AFTER_DAYS * DAY_MS).toISOString();

  let events;
  try {
    events = await client.getCalendarView(source.calendarUpn, source.msAccessToken, fromISO, toISO);
  } catch (err: unknown) {
    if (err instanceof GraphAuthError) {
      // A 403 means the token is valid but missing the Calendars.Read scope — that's a
      // consent problem, not an expiry, so prompt for the right consent instead.
      const message = err.forbidden
        ? 'The Microsoft token is missing the Calendars.Read permission — in Graph Explorer, consent to Calendars.Read, then paste a new token.'
        : err.invalidGrant
          ? 'Microsoft token expired — paste a fresh Graph token in the Source tab'
          : err.message;
      return fail(prisma, boardId, 0, message);
    }
    // Unexpected transport error — record it and re-throw so BullMQ marks the job failed.
    await prisma.boardCalendarSource.update({
      where: { boardId },
      data: {
        status: 'error',
        lastSyncSummary: {
          error: err instanceof Error ? err.message : 'Calendar sync failed',
        } as unknown as object,
      },
    });
    throw err;
  }

  const scanned = events.length;

  const firstGroup = (
    await prisma.group.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      take: 1,
      select: { id: true },
    })
  )[0];
  if (!firstGroup) {
    return fail(prisma, boardId, scanned, 'Board has no pipeline stage to place candidates in');
  }

  const interviewColumn = await prisma.boardColumn.findFirst({
    where: { boardId, name: INTERVIEW_DATE_COLUMN },
    select: { id: true },
  });

  // Interview, not cancelled, with a parseable candidate name.
  const candidates = events
    .map((e) => ({ event: e, name: parseCandidateName(e.subject) }))
    .filter(
      (c): c is { event: (typeof events)[number]; name: string } =>
        c.name !== null && isInterviewEvent(c.event.subject) && !c.event.isCancelled,
    );

  let created = 0;
  let updated = 0;
  for (const { event, name } of candidates) {
    const interviewDate = event.startIso.slice(0, 10);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.project.findUnique({
        where: { boardId_calendarEventId: { boardId, calendarEventId: event.id } },
        select: { id: true },
      });
      let projectId: string;
      if (existing) {
        projectId = existing.id;
        updated += 1;
      } else {
        const row = await tx.project.create({
          data: {
            name,
            owner: '',
            status: 'NOT_STARTED',
            boardId,
            groupId: firstGroup.id,
            calendarEventId: event.id,
          },
          select: { id: true },
        });
        projectId = row.id;
        created += 1;
      }
      if (interviewColumn && interviewDate) {
        await tx.projectFieldValue.upsert({
          where: { projectId_columnId: { projectId, columnId: interviewColumn.id } },
          create: { projectId, columnId: interviewColumn.id, value: interviewDate },
          update: { value: interviewDate },
        });
      }
    });
  }

  const summary = { scanned, created, updated };
  await prisma.boardCalendarSource.update({
    where: { boardId },
    data: { status: 'idle', lastSyncedAt: now, lastSyncSummary: summary as unknown as object },
  });
  return summary;
}

export async function handleCalendarSourceSyncJob(
  jobData: { boardId: string },
  prisma: PrismaClient,
  client: CalendarClient = new GraphCalendarClient(),
): Promise<CalendarSourceSyncResult> {
  return runCalendarSourceSync(jobData.boardId, { prisma, client, now: new Date() });
}
