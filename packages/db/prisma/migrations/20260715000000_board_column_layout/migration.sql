-- Monday-style per-board grid layout: { hidden: string[], widths: Record<colKey, number> }.
-- Nullable and additive; existing boards fall back to defaults until a layout is saved.
ALTER TABLE "boards" ADD COLUMN "column_layout" JSONB;
