-- EI-016c — Drop legacy Phase 3 Postgres tables.
-- These tables are superseded by their ClickHouse equivalents
-- (cockpit.jira_issues, cockpit.github_issues, cockpit.github_milestones,
-- cockpit.ado_work_items). Run EI-016b (backfill-to-clickhouse.ts) BEFORE
-- applying this migration so the data is preserved.
--
-- This migration is hand-written rather than `prisma migrate dev`-generated
-- because the historical migration history (documented 2026-05-11) has the
-- duplicate `github_issue_id` ADD COLUMN conflict that prevents shadow-DB
-- replay. To apply on a clean environment:
--
--     pnpm --filter @deckgauge/db exec prisma migrate deploy
--
-- If the shadow-DB conflict still trips you, mark this migration as applied
-- after running the SQL manually:
--
--     prisma migrate resolve --applied 20260603120000_drop_legacy_phase3_tables

-- ── Data tables (data now lives in ClickHouse) ───────────────────────────────
DROP TABLE IF EXISTS "jira_issues" CASCADE;
DROP TABLE IF EXISTS "jira_epics" CASCADE;
DROP TABLE IF EXISTS "jira_projects" CASCADE;
DROP TABLE IF EXISTS "github_issues" CASCADE;
DROP TABLE IF EXISTS "github_milestones" CASCADE;
DROP TABLE IF EXISTS "azure_devops_work_items" CASCADE;

-- NOTE: legacy *SyncConfig tables (jira_sync_configs, github_sync_configs,
-- azure_devops_sync_configs) are KEPT for now — they hold per-board mapping
-- config that EI-016b's migrate-sync-configs.ts has already replicated into
-- the new *ProjectSync + Board*Source tables. The legacy config tables can
-- be dropped in a follow-up migration once all code paths have been verified
-- to read from the new tables exclusively.
