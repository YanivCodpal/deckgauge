-- Phase B: per-board column layout (order + hidden), board-scoped.
ALTER TABLE "employee_boards" ADD COLUMN "column_config" JSONB;
