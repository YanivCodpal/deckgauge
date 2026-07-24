-- OrgEmployee: Graph identity + departure marker
ALTER TABLE "org_employees" ADD COLUMN "ms_graph_id" TEXT;
ALTER TABLE "org_employees" ADD COLUMN "departed_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "org_employees_org_tree_id_ms_graph_id_key"
  ON "org_employees"("org_tree_id", "ms_graph_id");

-- OrgTreeSource: one external source config per tree
CREATE TABLE "org_tree_sources" (
  "id" TEXT NOT NULL,
  "org_tree_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'microsoft',
  "root_upn" TEXT NOT NULL,
  "root_graph_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "last_synced_at" TIMESTAMP(3),
  "last_sync_summary" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_tree_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_tree_sources_org_tree_id_key" ON "org_tree_sources"("org_tree_id");
ALTER TABLE "org_tree_sources" ADD CONSTRAINT "org_tree_sources_org_tree_id_fkey"
  FOREIGN KEY ("org_tree_id") REFERENCES "org_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
