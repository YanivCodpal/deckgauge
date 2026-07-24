-- Slice 1: employee profile + current salary fields (all nullable, additive)
ALTER TABLE "org_employees"
  ADD COLUMN "employee_display_id" TEXT,
  ADD COLUMN "business_title" TEXT,
  ADD COLUMN "hire_date" TIMESTAMP(3),
  ADD COLUMN "location" TEXT,
  ADD COLUMN "employee_type" TEXT,
  ADD COLUMN "time_type" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "work_address" TEXT,
  ADD COLUMN "salary_current" INTEGER,
  ADD COLUMN "salary_currency" TEXT;
