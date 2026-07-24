-- Add nullable jql_filter column to board_jira_sources for per-source JQL filtering.

ALTER TABLE "board_jira_sources" ADD COLUMN "jql_filter" TEXT;
