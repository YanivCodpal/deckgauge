-- Multi-board fan-out fix.
--
-- Previously `projects.ado_work_item_id` and `projects.github_issue_id` each
-- carried a single-column unique constraint. The promote services
-- (azure-devops-promote.service.ts, github-promote.service.ts) are designed
-- to fan one upstream item out to multiple boards — the same adoWorkItemId
-- legitimately needs to exist on every board that subscribes to the
-- underlying project sync. The single-column unique blocked the second
-- board's promote with `Unique constraint failed`, producing empty boards
-- for the new BoardAdoSource/BoardGitHubSource rows.
--
-- This migration replaces those single-column uniques with composite
-- uniques on (board_id, ado_work_item_id) and (board_id, github_issue_id),
-- which is what the multi-board fan-out actually requires.

DROP INDEX IF EXISTS "projects_ado_work_item_id_key";
DROP INDEX IF EXISTS "projects_github_issue_id_key";

CREATE UNIQUE INDEX "projects_board_id_ado_work_item_id_key"
  ON "projects" ("board_id", "ado_work_item_id");

CREATE UNIQUE INDEX "projects_board_id_github_issue_id_key"
  ON "projects" ("board_id", "github_issue_id");
