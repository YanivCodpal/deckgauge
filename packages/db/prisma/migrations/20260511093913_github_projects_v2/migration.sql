-- AlterTable: add GitHub Projects v2 columns to github_sync_configs
ALTER TABLE "github_sync_configs" ADD COLUMN "project_owner" TEXT;
ALTER TABLE "github_sync_configs" ADD COLUMN "project_number" INTEGER;
ALTER TABLE "github_sync_configs" ADD COLUMN "project_node_id" TEXT;
ALTER TABLE "github_sync_configs" ADD COLUMN "no_status_board_status_id" TEXT;

-- AlterTable: add GitHub Projects v2 columns to github_issues
ALTER TABLE "github_issues" ADD COLUMN "project_item_id" TEXT;
ALTER TABLE "github_issues" ADD COLUMN "project_status_name" TEXT;
