-- P9 — Drop legacy *SyncConfig tables.
-- Superseded by *ProjectSync + Board*Source tables (Phase 3, P5).
-- All production code paths now read from the new tables (P9.1-P9.4).
-- API services for the legacy endpoints have been deleted (P9.5-P9.7).
--
-- Drop in reverse FK order (children first, parents last). The legacy
-- *SyncConfig tables had no FKs pointing into them from any surviving
-- table — the previously-blocking AzureDevOpsWorkItem.sync_config_id was
-- already dropped together with the azure_devops_work_items table in
-- migration 20260603120000_drop_legacy_phase3_tables.

DROP TABLE IF EXISTS "gitlab_sync_configs" CASCADE;
DROP TABLE IF EXISTS "azure_devops_sync_configs" CASCADE;
DROP TABLE IF EXISTS "github_sync_configs" CASCADE;
DROP TABLE IF EXISTS "jira_sync_configs" CASCADE;
