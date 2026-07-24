-- Add opt-in "sync all repos" mode to ADO project syncs.
ALTER TABLE "azure_devops_project_syncs"
  ADD COLUMN "sync_all_repos" BOOLEAN NOT NULL DEFAULT false;
