-- Restore four columns dropped in 20260617000000_github_bulk_repo_ingestion.
-- These remain read+written by the existing worker handler until Task 15
-- of the GitHub bulk-repo ingestion plan rewrites it.

ALTER TABLE "github_repo_syncs"
    ADD COLUMN "sync_prs"             BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN "sync_commits"         BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN "last_commit_sync_at"  TIMESTAMP(3),
    ADD COLUMN "last_synced_at"       TIMESTAMP(3);
