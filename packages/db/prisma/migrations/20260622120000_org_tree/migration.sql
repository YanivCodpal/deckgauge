-- Org Tree foundation: roster, hierarchy, identity aliases, per-employee snapshot.
-- Additive: new tables only.
CREATE TABLE "org_trees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMP(3),
    "last_sync_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_trees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_employees" (
    "id" TEXT NOT NULL,
    "org_tree_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "manager_external_id" TEXT,
    "manager_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_contribution_at" TIMESTAMP(3),
    "has_assignment" BOOLEAN NOT NULL DEFAULT false,
    "stats_json" JSONB,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_employee_aliases" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_employee_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_employees_org_tree_id_external_id_key" ON "org_employees"("org_tree_id", "external_id");
CREATE INDEX "org_employees_org_tree_id_idx" ON "org_employees"("org_tree_id");
CREATE INDEX "org_employees_manager_id_idx" ON "org_employees"("manager_id");
CREATE UNIQUE INDEX "org_employee_aliases_employee_id_provider_kind_value_key" ON "org_employee_aliases"("employee_id", "provider", "kind", "value");
CREATE INDEX "org_employee_aliases_employee_id_idx" ON "org_employee_aliases"("employee_id");

ALTER TABLE "org_employees" ADD CONSTRAINT "org_employees_org_tree_id_fkey" FOREIGN KEY ("org_tree_id") REFERENCES "org_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_employees" ADD CONSTRAINT "org_employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "org_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_employee_aliases" ADD CONSTRAINT "org_employee_aliases_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "org_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
