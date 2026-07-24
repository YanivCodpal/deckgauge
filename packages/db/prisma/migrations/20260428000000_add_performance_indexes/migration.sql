-- Performance indexes: address sequential scans identified in pg_stat_user_tables

-- Project composite indexes for board queries, dashboard widgets, and ordered listings
CREATE INDEX "projects_board_id_status_idx" ON "projects"("board_id", "status");
CREATE INDEX "projects_board_id_updatedAt_idx" ON "projects"("board_id", "updatedAt");
CREATE INDEX "projects_board_id_owner_id_idx" ON "projects"("board_id", "owner_id");
CREATE INDEX "projects_group_id_order_idx" ON "projects"("group_id", "order");

-- Group ordering within boards
CREATE INDEX "groups_board_id_position_idx" ON "groups"("board_id", "position");

-- Board column ordering
CREATE INDEX "board_columns_boardId_order_idx" ON "board_columns"("boardId", "order");

-- Sync runs: enable pruning queries and status filtering (53k+ rows, no index besides PK)
CREATE INDEX "sync_runs_startedAt_idx" ON "sync_runs"("startedAt");
CREATE INDEX "sync_runs_status_idx" ON "sync_runs"("status");

-- Upload lookups by parent
CREATE INDEX "uploads_project_id_idx" ON "uploads"("project_id");
CREATE INDEX "uploads_comment_id_idx" ON "uploads"("comment_id");

-- GitHub issues by repo (used in sync queries)
CREATE INDEX "github_issues_repo_full_name_idx" ON "github_issues"("repo_full_name");

-- ADO work items by sync config
CREATE INDEX "azure_devops_work_items_sync_config_id_idx" ON "azure_devops_work_items"("sync_config_id");

-- Jira sync config by board (currently 3237 seq scans, 0 idx scans)
CREATE INDEX "jira_sync_configs_board_id_idx" ON "jira_sync_configs"("board_id");
