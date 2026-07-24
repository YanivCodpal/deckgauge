-- CreateEnum
CREATE TYPE "timesheet_rule_scope" AS ENUM ('ROLE', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "timesheet_status_rules" (
    "id" TEXT NOT NULL,
    "scope" "timesheet_rule_scope" NOT NULL,
    "role" TEXT,
    "employee_id" TEXT,
    "in_progress_statuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "timesheet_status_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_status_rules_scope_role_employee_id_key" ON "timesheet_status_rules"("scope", "role", "employee_id");
