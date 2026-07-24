-- Add issue type filter to sync config
ALTER TABLE "github_sync_configs"
  ADD COLUMN "allowed_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add issue type column
ALTER TABLE "github_issues"
  ADD COLUMN "type" TEXT;
