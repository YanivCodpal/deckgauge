-- Drop the four deprecated GitHubRepoSync columns now that the old
-- handleGitHubIntelligenceSync handler and its callers have been retired.
ALTER TABLE "github_repo_syncs"
  DROP COLUMN IF EXISTS "sync_prs",
  DROP COLUMN IF EXISTS "sync_commits",
  DROP COLUMN IF EXISTS "last_commit_sync_at",
  DROP COLUMN IF EXISTS "last_synced_at";
