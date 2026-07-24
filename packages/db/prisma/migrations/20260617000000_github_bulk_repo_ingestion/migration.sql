-- AlterTable: github_repo_syncs — drop legacy per-type sync flags + watermarks
ALTER TABLE "github_repo_syncs" DROP COLUMN "sync_prs";
ALTER TABLE "github_repo_syncs" DROP COLUMN "sync_commits";
ALTER TABLE "github_repo_syncs" DROP COLUMN "last_commit_sync_at";
ALTER TABLE "github_repo_syncs" DROP COLUMN "last_synced_at";

-- AlterTable: github_repo_syncs — add repo metadata
ALTER TABLE "github_repo_syncs" ADD COLUMN "default_branch" TEXT NOT NULL DEFAULT 'main';
ALTER TABLE "github_repo_syncs" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "github_repo_syncs" ADD COLUMN "language" TEXT;
ALTER TABLE "github_repo_syncs" ADD COLUMN "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "github_repo_syncs" ADD COLUMN "last_pushed_at" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "open_issues_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: github_repo_syncs — tier + per-data-type watermarks
ALTER TABLE "github_repo_syncs" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'warm';
ALTER TABLE "github_repo_syncs" ADD COLUMN "prs_watermark" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "commits_watermark" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "reviews_watermark" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "workflow_runs_watermark" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "deployments_watermark" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "issues_watermark" TIMESTAMP(3);

-- AlterTable: github_repo_syncs — backfill + health + soft-delete
ALTER TABLE "github_repo_syncs" ADD COLUMN "backfill_months" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "github_repo_syncs" ADD COLUMN "backfill_complete_at" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "last_success_at" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "last_error_at" TIMESTAMP(3);
ALTER TABLE "github_repo_syncs" ADD COLUMN "last_error_message" TEXT;
ALTER TABLE "github_repo_syncs" ADD COLUMN "disabled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "github_repo_syncs_tier_last_success_at_idx" ON "github_repo_syncs"("tier", "last_success_at");
CREATE INDEX "github_repo_syncs_disabled_at_idx" ON "github_repo_syncs"("disabled_at");

-- CreateTable: pr_jira_links
CREATE TABLE "pr_jira_links" (
    "id" TEXT NOT NULL,
    "pr_id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "jira_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "merged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pr_jira_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pr_jira_links_pr_id_jira_key_source_key" ON "pr_jira_links"("pr_id", "jira_key", "source");
CREATE INDEX "pr_jira_links_jira_key_idx" ON "pr_jira_links"("jira_key");
CREATE INDEX "pr_jira_links_repo_full_name_idx" ON "pr_jira_links"("repo_full_name");

-- Backfill: convert each GitHubInstance.repos[] entry into an enabled GitHubRepoSync row
-- (idempotent — only inserts when no row exists for the (instance, repo) pair)
INSERT INTO github_repo_syncs (id, github_instance_id, repo_full_name, default_branch, tier, backfill_months, created_at, updated_at)
SELECT
  'cuid_' || md5(gi.id || ':' || r.repo)::text,
  gi.id,
  r.repo,
  'main',
  'warm',
  12,
  now(),
  now()
FROM github_instances gi, LATERAL unnest(gi.repos) AS r(repo)
WHERE NOT EXISTS (
  SELECT 1 FROM github_repo_syncs s
  WHERE s.github_instance_id = gi.id AND s.repo_full_name = r.repo
);
