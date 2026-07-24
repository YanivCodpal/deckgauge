import { PrismaClient } from '@deckgauge/db'
import { JiraPort } from '@deckgauge/shared'
import { JiraPromoteService } from './jira-promote.service.js'
import { type ChClient } from './jira-dual-writer.js'

interface ProcessorInput {
  adapter: JiraPort
  projectKeys: string[]
  trigger: string
  db: PrismaClient
  syncConfigMap?: Map<string, string>  // projectKey → syncConfigId
  /**
   * Optional ClickHouse client. When provided, the processor dual-writes the
   * full unfiltered set of fetched epics+issues into the `jira_issues` CH table
   * BEFORE running promote/Postgres upserts. Omitted in tests that don't care
   * about CH coverage, so the call site stays backward-compatible.
   */
  ch?: ChClient
}

interface ProcessorOutput {
  status: string
  trigger: string
  epicCount: number
  issueCount: number
  finishedAt: Date | null
  errorMessage: string | null
}

export async function jiraSyncProcessor(input: ProcessorInput): Promise<ProcessorOutput> {
  const { adapter, projectKeys, trigger, db } = input

  // Create SyncRun record
  const syncRun = await db.syncRun.create({
    data: {
      status: 'PENDING',
      trigger: normalizeTrigger(trigger),
      startedAt: new Date(),
      source: 'jira',
    },
  })

  try {
    // Fetch data from adapter
    console.log(`[Processor] Fetching epics and issues for: ${projectKeys.join(', ')}`)
    const [epics, issues] = await Promise.all([
      adapter.fetchEpics(projectKeys),
      adapter.fetchIssues(projectKeys),
    ])
    console.log(`[Processor] Fetched ${epics.length} epics, ${issues.length} issues`)

    // NB: the basic sync no longer dual-writes jira_issues to ClickHouse. The
    // basic JiraPort carries no sprint / story-point / status-category data, so
    // its rows (sprint_name = null, status_category = 'Unknown') were clobbering
    // the richer JiraIntelligencePort rows in the ReplacingMergeTree (newest
    // synced_at wins), blanking Velocity / Planning Accuracy. The intelligence
    // sync is now the sole, streaming ClickHouse writer for jira_issues; the
    // basic sync owns only the Postgres board-promotion path below.

    // Note: previously this step upserted jira_projects, jira_epics, jira_issues
    // into Postgres mirror tables. Those tables were dropped by
    // 20260603120000_drop_legacy_phase3_tables. The promote service now reads
    // the fetched arrays directly via the payload arg below.

    // Second pass: promote Jira items to Project rows
    const promoteService = new JiraPromoteService(db)
    const promoteResult = await promoteService.promoteAll({
      epics: epics.map((e) => ({
        key: e.key,
        projectKey: e.projectKey,
        summary: e.summary,
        description: e.description ?? null,
        status: e.status,
        assignee: e.assignee ?? null,
        type: 'Epic',
      })),
      issues: issues.map((i) => ({
        key: i.key,
        projectKey: i.projectKey,
        summary: i.summary,
        description: i.description ?? null,
        status: i.status,
        assignee: i.assignee ?? null,
        type: i.type,
      })),
    })
    console.log(`[Processor] Promote: ${promoteResult.created} created, ${promoteResult.updated} updated, ${promoteResult.markedRemoved} marked removed`)

    // Update SyncRun with success
    const updated = await db.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        epicCount: epics.length,
        issueCount: issues.length,
      },
    })

    return {
      status: updated.status,
      trigger: updated.trigger,
      epicCount: updated.epicCount,
      issueCount: updated.issueCount,
      finishedAt: updated.finishedAt,
      errorMessage: updated.errorMessage,
    }
  } catch (error) {
    // Update SyncRun with failure
    const errorMessage = error instanceof Error ? error.message : String(error)
    const updated = await db.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage,
      },
    })

    return {
      status: updated.status,
      trigger: updated.trigger,
      epicCount: updated.epicCount,
      issueCount: updated.issueCount,
      finishedAt: updated.finishedAt,
      errorMessage: updated.errorMessage,
    }
  }
}

function normalizeTrigger(trigger: string): 'STARTUP' | 'MANUAL' | 'SCHEDULED' {
  const normalized = trigger.toUpperCase()
  if (normalized === 'STARTUP') return 'STARTUP'
  if (normalized === 'MANUAL') return 'MANUAL'
  if (normalized === 'SCHEDULED') return 'SCHEDULED'
  throw new Error(`Unknown trigger: ${trigger}`)
}
