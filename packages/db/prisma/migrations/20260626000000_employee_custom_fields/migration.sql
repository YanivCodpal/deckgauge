-- Phase C: per-board custom columns + type-erased field values.
CREATE TABLE "employee_columns" (
  "id" TEXT NOT NULL,
  "employee_board_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "config" JSONB,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_columns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "employee_columns_employee_board_id_idx" ON "employee_columns"("employee_board_id");

CREATE TABLE "employee_field_values" (
  "id" TEXT NOT NULL,
  "employee_column_id" TEXT NOT NULL,
  "org_employee_id" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_field_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employee_field_values_employee_column_id_org_employee_id_key"
  ON "employee_field_values"("employee_column_id", "org_employee_id");
CREATE INDEX "employee_field_values_org_employee_id_idx" ON "employee_field_values"("org_employee_id");

ALTER TABLE "employee_columns" ADD CONSTRAINT "employee_columns_employee_board_id_fkey"
  FOREIGN KEY ("employee_board_id") REFERENCES "employee_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_field_values" ADD CONSTRAINT "employee_field_values_employee_column_id_fkey"
  FOREIGN KEY ("employee_column_id") REFERENCES "employee_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_field_values" ADD CONSTRAINT "employee_field_values_org_employee_id_fkey"
  FOREIGN KEY ("org_employee_id") REFERENCES "org_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
