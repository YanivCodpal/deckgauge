-- Phase A: employee boards (board / group / membership over live OrgEmployee)
CREATE TABLE "employee_boards" (
  "id" TEXT NOT NULL,
  "org_tree_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scope_employee_id" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_boards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "employee_boards_org_tree_id_idx" ON "employee_boards"("org_tree_id");

CREATE TABLE "employee_groups" (
  "id" TEXT NOT NULL,
  "employee_board_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366F1',
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_groups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "employee_groups_employee_board_id_idx" ON "employee_groups"("employee_board_id");

CREATE TABLE "employee_board_members" (
  "id" TEXT NOT NULL,
  "employee_board_id" TEXT NOT NULL,
  "org_employee_id" TEXT NOT NULL,
  "employee_group_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_board_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_board_members_employee_board_id_org_employee_id_key"
  ON "employee_board_members"("employee_board_id", "org_employee_id");
CREATE INDEX "employee_board_members_employee_group_id_position_idx"
  ON "employee_board_members"("employee_group_id", "position");

ALTER TABLE "employee_boards" ADD CONSTRAINT "employee_boards_org_tree_id_fkey"
  FOREIGN KEY ("org_tree_id") REFERENCES "org_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_boards" ADD CONSTRAINT "employee_boards_scope_employee_id_fkey"
  FOREIGN KEY ("scope_employee_id") REFERENCES "org_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_groups" ADD CONSTRAINT "employee_groups_employee_board_id_fkey"
  FOREIGN KEY ("employee_board_id") REFERENCES "employee_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_board_members" ADD CONSTRAINT "employee_board_members_employee_board_id_fkey"
  FOREIGN KEY ("employee_board_id") REFERENCES "employee_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_board_members" ADD CONSTRAINT "employee_board_members_org_employee_id_fkey"
  FOREIGN KEY ("org_employee_id") REFERENCES "org_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_board_members" ADD CONSTRAINT "employee_board_members_employee_group_id_fkey"
  FOREIGN KEY ("employee_group_id") REFERENCES "employee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
