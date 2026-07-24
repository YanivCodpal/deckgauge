-- CreateTable
CREATE TABLE "org_tree_timesheet_configs" (
    "org_tree_id" TEXT NOT NULL,
    "active_statuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_tree_timesheet_configs_pkey" PRIMARY KEY ("org_tree_id")
);

-- AddForeignKey
ALTER TABLE "org_tree_timesheet_configs" ADD CONSTRAINT "org_tree_timesheet_configs_org_tree_id_fkey" FOREIGN KEY ("org_tree_id") REFERENCES "org_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
