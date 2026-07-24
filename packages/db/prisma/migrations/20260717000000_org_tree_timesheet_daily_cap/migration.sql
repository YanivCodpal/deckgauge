-- Per-day working-hours cap for the timesheet engine.
-- Nullable: NULL = use the engine default (8h); 0 = uncapped.
ALTER TABLE "org_tree_timesheet_configs" ADD COLUMN "daily_cap_hours" DOUBLE PRECISION;
