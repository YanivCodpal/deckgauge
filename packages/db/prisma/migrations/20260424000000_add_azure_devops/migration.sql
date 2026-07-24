-- CreateEnum
CREATE TYPE "azure_devops_auth_method" AS ENUM ('pat', 'basic');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "ado_project" TEXT,
ADD COLUMN     "ado_removed_from_source" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ado_synced_fields" JSONB,
ADD COLUMN     "ado_work_item_id" INTEGER;

-- AlterTable
ALTER TABLE "sync_runs" DROP COLUMN "circuitOpen",
ADD COLUMN     "source" TEXT,
ADD COLUMN     "work_item_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "azure_devops_instances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org_url" TEXT NOT NULL,
    "auth_method" "azure_devops_auth_method" NOT NULL,
    "access_token" TEXT NOT NULL,
    "username" TEXT,
    "projects" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "azure_devops_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "azure_devops_sync_configs" (
    "id" TEXT NOT NULL,
    "azure_devops_instance_id" TEXT NOT NULL,
    "ado_project" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "target_group_id" TEXT,
    "allowed_work_item_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wiql_filter" TEXT,
    "field_mappings" JSONB NOT NULL DEFAULT '{}',
    "status_mapping" JSONB NOT NULL DEFAULT '{}',
    "default_synced_fields" TEXT[] DEFAULT ARRAY['name', 'status', 'owner']::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "azure_devops_sync_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "azure_devops_work_items" (
    "id" TEXT NOT NULL,
    "ado_id" INTEGER NOT NULL,
    "ado_project" TEXT NOT NULL,
    "parent_id" TEXT,
    "ado_parent_id" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "assigned_to" TEXT,
    "area_path" TEXT,
    "iteration_path" TEXT,
    "description" TEXT,
    "sync_config_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "azure_devops_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "azure_devops_sync_configs_board_id_ado_project_key" ON "azure_devops_sync_configs"("board_id", "ado_project");

-- CreateIndex
CREATE UNIQUE INDEX "azure_devops_work_items_ado_id_sync_config_id_key" ON "azure_devops_work_items"("ado_id", "sync_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_ado_work_item_id_key" ON "projects"("ado_work_item_id");

-- AddForeignKey
ALTER TABLE "azure_devops_sync_configs" ADD CONSTRAINT "azure_devops_sync_configs_azure_devops_instance_id_fkey" FOREIGN KEY ("azure_devops_instance_id") REFERENCES "azure_devops_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "azure_devops_sync_configs" ADD CONSTRAINT "azure_devops_sync_configs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "azure_devops_sync_configs" ADD CONSTRAINT "azure_devops_sync_configs_target_group_id_fkey" FOREIGN KEY ("target_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "azure_devops_work_items" ADD CONSTRAINT "azure_devops_work_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "azure_devops_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "azure_devops_work_items" ADD CONSTRAINT "azure_devops_work_items_sync_config_id_fkey" FOREIGN KEY ("sync_config_id") REFERENCES "azure_devops_sync_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
