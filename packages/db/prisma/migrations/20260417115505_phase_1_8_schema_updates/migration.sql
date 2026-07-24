-- Phase 1.8 schema updates
-- Added circuitOpen to sync_runs, github fields to projects
-- These changes were applied directly to the database

ALTER TABLE "sync_runs" ADD COLUMN "circuitOpen" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "projects"
ADD COLUMN "github_issue_id" TEXT,
ADD COLUMN "github_removed_from_source" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "github_repo_full_name" TEXT,
ADD COLUMN "github_synced_fields" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "projects_github_issue_id_key" ON "projects"("github_issue_id");
