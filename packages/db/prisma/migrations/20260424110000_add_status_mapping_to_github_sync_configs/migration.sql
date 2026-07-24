-- AlterTable
ALTER TABLE "github_sync_configs" ADD COLUMN IF NOT EXISTS "status_mapping" JSONB NOT NULL DEFAULT '{}';

-- Also update default_synced_fields to include description
ALTER TABLE "github_sync_configs" ALTER COLUMN "default_synced_fields" SET DEFAULT ARRAY['name', 'description', 'status', 'owner'];
