-- Per-repo intelligence watermark for ADO project syncs.
-- Additive: new table only; no existing columns touched.
CREATE TABLE "ado_repo_sync_states" (
    "id" TEXT NOT NULL,
    "azure_devops_project_sync_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "repo_name" TEXT NOT NULL,
    "last_pr_sync_at" TIMESTAMP(3),
    "last_commit_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ado_repo_sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ado_repo_sync_states_azure_devops_project_sync_id_repo_id_key" ON "ado_repo_sync_states"("azure_devops_project_sync_id", "repo_id");

-- CreateIndex
CREATE INDEX "ado_repo_sync_states_azure_devops_project_sync_id_idx" ON "ado_repo_sync_states"("azure_devops_project_sync_id");

-- AddForeignKey
ALTER TABLE "ado_repo_sync_states" ADD CONSTRAINT "ado_repo_sync_states_azure_devops_project_sync_id_fkey" FOREIGN KEY ("azure_devops_project_sync_id") REFERENCES "azure_devops_project_syncs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
