-- CreateEnum
CREATE TYPE "jira_import_level" AS ENUM ('epic', 'issue');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "jira_key" TEXT,
ADD COLUMN     "jira_project_key" TEXT,
ADD COLUMN     "jira_removed_from_source" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jira_synced_fields" JSONB,
ADD COLUMN     "jira_type" "jira_import_level";

-- CreateTable
CREATE TABLE "jira_sync_configs" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "jira_instance_id" TEXT NOT NULL,
    "jira_project_key" TEXT NOT NULL,
    "import_level" "jira_import_level" NOT NULL DEFAULT 'epic',
    "target_group_id" TEXT,
    "field_mappings" JSONB NOT NULL DEFAULT '{}',
    "default_synced_fields" JSONB NOT NULL DEFAULT '["name", "status", "owner"]',
    "status_mapping" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_sync_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_sync_configs_board_id_jira_project_key_key" ON "jira_sync_configs"("board_id", "jira_project_key");

-- CreateIndex
CREATE UNIQUE INDEX "projects_jira_key_jira_project_key_key" ON "projects"("jira_key", "jira_project_key");

-- AddForeignKey
ALTER TABLE "jira_sync_configs" ADD CONSTRAINT "jira_sync_configs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_sync_configs" ADD CONSTRAINT "jira_sync_configs_jira_instance_id_fkey" FOREIGN KEY ("jira_instance_id") REFERENCES "jira_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_sync_configs" ADD CONSTRAINT "jira_sync_configs_target_group_id_fkey" FOREIGN KEY ("target_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
