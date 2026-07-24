-- Recruitment calendar ingest: link a candidate row to the Microsoft-calendar event
-- it was created from, so a "Sync now" re-run updates the row instead of duplicating it.
ALTER TABLE "projects" ADD COLUMN "calendar_event_id" TEXT;

-- Unique per board. calendar_event_id is NULL for normal (non-calendar) rows, and
-- Postgres treats NULLs as distinct, so multiple null rows coexist while real event
-- ids stay unique within a board.
CREATE UNIQUE INDEX "projects_board_id_calendar_event_id_key"
  ON "projects" ("board_id", "calendar_event_id");
