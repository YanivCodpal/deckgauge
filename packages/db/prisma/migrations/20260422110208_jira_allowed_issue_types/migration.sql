-- Migration: jira_allowed_issue_types
-- Replaces importLevel enum with allowedIssueTypes text array on jira_sync_configs.
-- Also changes Project.jiraType from enum to plain text.

-- 1. Add new column with empty-array default
ALTER TABLE "jira_sync_configs" ADD COLUMN "allowed_issue_types" TEXT[] NOT NULL DEFAULT '{}';

-- 2. Backfill existing rows (enum stored as 'epic'/'issue' in Postgres)
UPDATE "jira_sync_configs"
  SET "allowed_issue_types" = ARRAY['Epic']
  WHERE "import_level" = 'epic';

UPDATE "jira_sync_configs"
  SET "allowed_issue_types" = ARRAY['Story', 'Task', 'Bug', 'Sub-task']
  WHERE "import_level" = 'issue';

-- 3. Drop the old import_level column
ALTER TABLE "jira_sync_configs" DROP COLUMN "import_level";

-- 4. Change jira_type column in projects from enum to plain text
ALTER TABLE "projects"
  ALTER COLUMN "jira_type" TYPE TEXT USING "jira_type"::TEXT;

-- 5. Drop the enum type (only after the column referencing it is gone)
DROP TYPE IF EXISTS "public"."jira_import_level";
